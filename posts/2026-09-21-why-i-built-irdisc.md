---
title: "Why I built IRdisC"
date: 2026-09-21
author: "Max"
description: "How a few days of exploring IRC on Debian turned into my own terminal IRC client."
---

A few days ago, IRdisC did not exist.

I had recently installed Debian and started exploring IRC for the first time. I joined a few channels, tried different clients and slowly learned how IRC actually works.

At some point, I had a very simple thought:

**What if I made my own IRC client?**

That was not really a plan.

## From curiosity to a repository

I liked the terminal side of IRC. It feels direct, lightweight and strangely appropriate for a protocol that has been around for so long.

But as a new IRC user, I also noticed that terminal clients can expect you to already know quite a lot.

Commands, networks, channels, private messages, WHOIS, NickServ, ChanServ — none of these things are particularly complicated once you understand them, but there is still a learning curve.

Graphical clients make some of that easier, but I did not want to replace the terminal experience with a heavy graphical interface.

I wanted something in between.

A client that still feels like IRC in a terminal, but gives you a little more help discovering what you can actually do.

That became the basic idea behind IRdisC:

**IRC, discomplicated.**

## What I wanted

IRdisC is not supposed to reinvent IRC.

The goal is to keep the parts I like about terminal IRC clients while reducing some unnecessary friction.

You can still use commands. Keyboard access remains complete. The interface is still a TUI running in your terminal.

But there are also menus, built-in help, conversation and user lists, contextual actions, connection profiles and other small conveniences that make the client easier to explore without memorizing everything first.

The mouse is optional. The terminal is not.

I also wanted the project to stay lightweight. IRdisC is written in Python using `curses` and has no third-party runtime Python dependencies.

## Then the idea got out of hand

The funny part is that I did not sit down with a roadmap and decide that I was going to build an IRC client.

I was just exploring IRC.

Then I started thinking about what I would change.

Then I started defining how the interface should behave.

Then I had a name.

Then there was a repository.

At that point it was probably too late.

I used AI extensively as a development tool during implementation and iteration. My part of the process involved deciding how IRdisC should work, shaping its interface and behavior, testing it, finding problems, refining requirements and repeatedly asking myself whether a feature actually made IRC simpler or just added more stuff.

After a lot of testing and iteration, the random idea had turned into something I could actually use to connect to IRC.

And eventually:

**IRdisC v0.1.0 existed.**

## What now?

v0.1.0 is only the beginning.

There are things I want to improve, things I want to experiment with and probably bugs waiting in places I have not looked yet.

But the original goal remains the same.

IRdisC should feel like a terminal IRC client.

It should not hide IRC behind a completely different experience.

It should just make IRC a little easier to approach.

That's it.

**⇹ IRdisC — IRC, discomplicated.**

You can find the source code on [GitHub](https://github.com/X86Max/IRdisC), or head to the [Download](./index.html#download) and [Documentation](./index.html#docs) pages to try it.
