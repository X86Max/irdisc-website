---
title: "IRdisC has a website now"
date: 2026-09-22
author: "Max"
description: "A terminal, an old-school software website and a surprisingly complicated trip to GitHub Pages."
---

Yesterday, I wrote about how a few days of exploring IRC somehow ended
with me releasing my own IRC client.

Today, IRdisC has a website.

Apparently, this is how projects grow.

## The first idea was a terminal

A normal project website would have been the obvious choice.

So naturally, I did not start there.

Since IRdisC is a terminal IRC client, my first idea was to make the
website itself behave like a terminal.

Not a website that just looks vaguely like a terminal.

An actual interactive fake terminal.

You would open the page and see:

``` text
⇹ IRdisC Web Terminal
IRC, discomplicated.

Type 'help' to get started.

guest@irdisc:~$ _
```

From there, commands like `about`, `features`, `install`, `docs`,
`releases` and `blog` would let you navigate the project.

And it worked.

There was command history, autocomplete, installation instructions,
release information and even a few harmless easter eggs.

I liked it.

There was just one problem.

## Maybe the weird interface should not be the only interface

The Web Terminal was fun and fit IRdisC extremely well, but eventually I
realized that making it the entire website was probably taking the idea
a little too far.

IRdisC is supposed to make IRC easier to approach.

Making visitors learn commands just to navigate its website would be a
slightly questionable interpretation of that philosophy.

So I started thinking about what an ordinary IRdisC website should look
like.

I did not want a modern SaaS landing page.

No giant hero section.

No floating cards.

No gradients everywhere.

No enormous button telling you to "GET STARTED FOR FREE."

IRdisC is a small open-source terminal application.

Its website should look like the website of a small open-source
application.

And that led me backwards.

## Back to the early 2000s

The final direction was inspired by the general design language of
open-source and software project websites from roughly 2001--2004.

Small fonts.

Simple borders.

Underlined links.

Compact navigation.

A screenshot of the actual software near the top.

Download and documentation links that just look like download and
documentation links.

No attempt to pretend IRdisC is a startup valued at \$400 million.

Just:

**Here is the software.**

**Here is what it does.**

**Here is the screenshot.**

**Here is where you download it.**

And, strangely enough, it felt much more appropriate.

The Web Terminal survived too.

It is now an alternate interface accessible from the main website.

So if you want a normal website, you get one.

If you want to type `help` into a browser for absolutely no reason, that
option remains available.

## A small corner of the web

Once the basic website existed, I started thinking about something else
that fits both IRC and the older web surprisingly well:

Community.

The site now has space for community websites, a small webring, a
guestbook and a showcase for IRdisC setups, screenshots, interesting
hardware and related things people make.

There is also an official animated 88×31 IRdisC button.

Because if I am making an old-school website, I am going all the way.

Community submissions are intentionally simple. There are no accounts,
likes, votes or mysterious engagement algorithms.

Submissions go through GitHub, are reviewed manually and only then
become part of the website.

The goal is not to build another social network.

It is just to have a little community section on a project website.

Like the web used to have.

## Then deployment happened

The website was ready.

The repository was ready.

The build worked.

The tests passed.

There was only one thing left to do:

Put it online.

This should have been the easiest part.

I prepared a GitHub Actions workflow to build the website and deploy it
to GitHub Pages.

GitHub had other plans.

GitHub Actions was disabled at the account level.

The workflow existed.

The repository recognized it.

It simply could not run.

After some investigation, configuration checking and a support ticket
that did not solve the restriction, I tried the simpler GitHub Pages
approach instead:

**Deploy from a branch.**

A tiny test `index.html` worked.

That was enough proof for me.

The final solution ended up being much simpler than the workflow I
originally prepared.

The source code stays on `main`.

`python3 build.py` generates the complete static website.

The generated site is copied into `/docs`.

And GitHub Pages publishes `main:/docs` directly.

No deployment workflow.

No external hosting service.

Just static files in the repository.

For a website deliberately designed like an open-source project site
from 2003, this feels almost suspiciously appropriate.

## So... here it is

IRdisC now has a home on the web:

[**x86max.github.io/irdisc-website/**](https://x86max.github.io/irdisc-website/)

The normal website is the default.

The Web Terminal is still there.

The 88×31 button is there.

The community sections are there, currently waiting for actual people
rather than fake activity.

And the whole thing is still just a static website that can be built
locally with Python.

Yesterday, IRdisC became a repository and a release.

Today, it got a website.

I am becoming slightly concerned about what happens tomorrow.

**⇹ IRdisC --- IRC, discomplicated.**
