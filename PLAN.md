# Alumap plan

Your task is to build "Alumap", that is some kind of social network for alumnies of innopolis university.

You should use sveltekit and drizzle ORM backed by sqlite. Entire application in one container.
Use grammY for telegram bot.
Use tailwindcss 4.

Design it mobile-first, but

## Map

That is the home screen. You should use maplibregl and its prepared style.json from ../alumap-htmx

That is openfreemap with globe projection.

But, you need to:

- add glowing effect to the globe, like it is sky
- add stars on the background
  (may be it is easier to do this using opengl in maplibregl)

so it would look kind of like [blink map](./docs/blinkmap.png)

then,
add endpoint, that will generate geojson of events and users (alumnies)
and render that geojson on the map

draw avatars of the users, pictures of the events
and cluster them they are too close to each other.
use native maplibregl ways when possible, its wiki good examples.

## Events

Each event has its geolocation, name, picture, description ...

../alumap-htmx/schema.sql is a good reference of data, it contains almost everything I want to see in my application

but it can be improved in terms of relations, do not be shy to refactor it.

I don't want to use uuids: they are ugly and sqlite doesnt work good with them, so I want you to use nanoids for links, and just integers when possible.

Add list of events, but do not overcomplicate it: no filters or something. Even search is not really needed.
You can just somehow emphasize events that already pasted e.g. make them a bit darker/transparent/gray.
And ensure that pictures are not huge.

Any user can create an event, but events needs admin approval before they would appear in public.

## Profiles

Profiles should be quite detailed, like on linkedin, and with good UX of editing.
../alumap-htmx/schema.sql also should contain good reference of what fields profiles should implement

If I toggle my geolocation public, everyone then should be able to see me on the map (you should encounter me in geojson)
Otherwise, by default, I should not be seen on the map.

When I set my geolocation, I enter city name. ../alumap-htmx/ has good reference of functionaility of city search:
Use existing dataset of cities, add innopolis from the code and search for them. You also can add some fuzzysearch algorithm with some tree, so search would be faster.

## Telegram bot and miniapp

Add telegram bot, that will print some greeting message on start, mention me (@dofi4ka) as a developer
And add button to launch miniapp

miniapp should open url from ENV - our sveltekit site.

And add some verification flow, so if I have account on alumap, but have no telegram conntected, I can do it via some button on the site in profile.

## Registration and policies

When user not logged in, it can only see login page, and either login or register.

I can login through my email+password, and if I open it from telegram as miniapp and I have telegram account connected, it should use telegram flow for automatic authorization.

Use EXACT password hashing as in ../alumap-htmx/auth/ so old users passwords would work.

I can either register as alumni (only using @innopolis.university or @innopolis.ru emails) or as a friend (with any email)

You should send verification code on the email and then create user profile.

Use email smtp server from ENV variables.

After user registered, it should wait for administration approval to use the map.
When it is not approved, it can only see and edit their profile. (no map/events access etc)

## Admins

Admins - same users on same site (with flag admin=true)

Admins can see list of unapproved users/events and approve them.
They can unpublish events and edit users/events profiles.
They can ban users.

Admins cannot create/remove admins

## style

Use https://innopolis.university/ as a reference for design: white theme and bright green as a primary color.
