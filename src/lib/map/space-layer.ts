import { mat4 } from 'gl-matrix';
import type { CustomLayerInterface, CustomRenderMethodInput } from 'maplibre-gl';

/**
 * Space around the globe, drawn with WebGL as maplibre custom layers.
 *
 * For every pixel we unproject a ray with the inverse of maplibre's globe matrix
 * (the globe is a unit sphere in that space) and measure how close the ray passes
 * to the sphere center. That gives an exact atmosphere glow for any rotation/pitch,
 * and stars fixed to the globe frame, so they move as the globe rotates.
 *
 * - "space": stars + outer glow, goes under all map layers (the globe covers it)
 * - "atmosphere": soft haze on the globe limb, goes under the symbol layers
 */
export function createSpaceLayer(id: string, mode: 'space' | 'atmosphere'): CustomLayerInterface {
	let program: WebGLProgram;
	let uInvMatrix: WebGLUniformLocation | null;
	let uOpacity: WebGLUniformLocation | null;
	const inverse = new Float64Array(16) as unknown as mat4;

	const vertex = `#version 300 es
		out vec2 v_ndc;
		void main() {
			// fullscreen triangle
			vec2 pos = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)) * 2.0 - 1.0;
			v_ndc = pos;
			gl_Position = vec4(pos, 0.0, 1.0);
		}`;

	const fragment = `#version 300 es
		precision highp float;
		in vec2 v_ndc;
		uniform mat4 u_inv_matrix;
		uniform float u_opacity;
		out vec4 fragColor;

		vec3 unproject(float z) {
			vec4 p = u_inv_matrix * vec4(v_ndc, z, 1.0);
			return p.xyz / p.w;
		}

		float hash(vec3 p) {
			p = fract(p * 0.3183099 + 0.1);
			p *= 17.0;
			return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
		}

		float stars(vec3 dir) {
			const float SCALE = 220.0;
			vec3 p = dir * SCALE;
			vec3 cell = floor(p);
			float h = hash(cell);
			if (h > 0.035) return 0.0;
			// star position inside the cell, kept away from cell borders, projected on the shell
			vec3 offset = vec3(hash(cell + 1.7), hash(cell + 3.1), hash(cell + 5.3)) * 0.6 + 0.2;
			vec3 star = normalize(cell + offset) * SCALE;
			float px = length(fwidth(p));
			float size = mix(0.6, 1.6, hash(cell + 9.2)) * px;
			float d = length(p - star);
			return smoothstep(size, 0.0, d) * mix(0.35, 1.0, h / 0.035);
		}

		void main() {
			vec3 nearP = unproject(-1.0);
			vec3 dir = normalize(unproject(1.0) - nearP);
			float t = -dot(nearP, dir);
			// distance between the ray and globe center, in globe radii
			float d = t > 0.0 ? length(nearP + t * dir) : length(nearP);

			vec3 glowColor = vec3(0.32, 0.6, 1.0);
			${
				mode === 'space'
					? `
			if (d < 1.0) discard;
			float h = d - 1.0;
			float glow = 0.9 * exp(-h / 0.012) + 0.55 * exp(-h / 0.06) + 0.18 * exp(-h / 0.25);
			float s = stars(dir) * (1.0 - clamp(glow, 0.0, 1.0));
			vec3 color = glowColor * glow + vec3(0.92, 0.95, 1.0) * s;
			float a = clamp(glow + s, 0.0, 1.0) * u_opacity;
			fragColor = vec4(color * u_opacity, a);`
					: `
			if (d >= 1.0) discard;
			float haze = pow(smoothstep(0.75, 1.0, d), 2.5) * 0.55 * u_opacity;
			fragColor = vec4(glowColor * haze, haze);`
			}
		}`;

	function compile(gl: WebGL2RenderingContext, type: number, src: string) {
		const shader = gl.createShader(type)!;
		gl.shaderSource(shader, src);
		gl.compileShader(shader);
		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? '');
		return shader;
	}

	return {
		id,
		type: 'custom',
		renderingMode: '2d',

		onAdd(_map, glContext) {
			const gl = glContext as WebGL2RenderingContext;
			program = gl.createProgram()!;
			gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vertex));
			gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragment));
			gl.linkProgram(program);
			uInvMatrix = gl.getUniformLocation(program, 'u_inv_matrix');
			uOpacity = gl.getUniformLocation(program, 'u_opacity');
		},

		render(glContext, options: CustomRenderMethodInput) {
			const gl = glContext as WebGL2RenderingContext;
			const projection = options.defaultProjectionData;
			// fades out while maplibre switches from globe to flat map on high zooms
			const opacity = projection.projectionTransition;
			if (opacity <= 0.01) return;
			if (!mat4.invert(inverse, projection.mainMatrix as mat4)) return;

			gl.useProgram(program);
			gl.uniformMatrix4fv(uInvMatrix, false, new Float32Array(inverse));
			gl.uniform1f(uOpacity, opacity);
			gl.disable(gl.DEPTH_TEST);
			gl.enable(gl.BLEND);
			gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
			gl.bindVertexArray(null);
			gl.drawArrays(gl.TRIANGLES, 0, 3);
		}
	};
}
