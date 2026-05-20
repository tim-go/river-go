# Feature Taxonomy

## Purpose

This taxonomy defines the first set of contribution and map-feature types for River Go. It should keep user-submitted data consistent enough to search, filter, moderate, and display clearly.

## Top-Level Object Types

### River

A named watercourse, such as the River Wye or River Dart.

### River Section

A paddleable stretch of a river between a put-in and take-out. This is the primary planning object in the app.

### Gauge

A measuring station or data source used to show water level, flow, trend, forecast, or flood state.

### Access Point

A place where paddlers can enter, exit, portage, park, or reach the water.

### Feature

A notable physical or practical characteristic of the river.

### Hazard

A safety-relevant feature that may affect whether or how a paddler should use the section.

### Photo

A user-contributed image attached to a river object.

### Condition Report

A time-sensitive user report about current or recent conditions.

## Access Point Types

- put-in
- take-out
- combined put-in and take-out
- portage start
- portage end
- parking
- public transport
- campsite
- facility
- lock landing
- emergency exit

## Access Attributes

- public
- permission required
- licence required
- navigation authority
- club arrangement
- sensitive
- disputed
- unknown

## Physical Feature Types

- rapid
- riffle
- pool
- rock garden
- island
- bend
- confluence
- shoal
- beach
- landing
- bridge
- tunnel
- lock
- sluice
- weir
- dam
- ford
- stepping stones

## Hazard Types

- weir
- strainer
- fallen tree
- blockage
- low bridge
- strong current
- stopper
- undercut
- siphon
- sluice
- lock hazard
- flood debris
- construction works
- poor landing
- private land issue
- livestock
- pollution
- water quality warning
- navigation conflict
- other

## Hazard Severity

- info
- caution
- significant
- serious
- extreme

Severity should describe likely consequence and decision impact, not just fear level.

## Hazard Status

- active
- resolved
- seasonal
- unknown
- needs confirmation

## Condition Report Types

- paddled recently
- level report
- hazard update
- access update
- parking update
- portage update
- water quality
- event or closure
- general note

## River-Level Suitability Bands

Suggested labels:

- too low
- low but possible
- good
- pushy
- high
- not recommended
- unknown

Suitability may depend on:

- craft type
- ability level
- group size
- season
- river section
- flow trend

## Craft Suitability

- open canoe
- tandem canoe
- solo canoe
- inflatable canoe
- kayak
- whitewater kayak
- touring kayak
- SUP
- packraft

The app can start canoe-first but should keep the data model flexible.

## Difficulty and Experience

Suggested beginner-friendly scale:

- beginner
- novice
- intermediate
- advanced
- expert

Where whitewater grading applies, store that separately:

- grade I
- grade II
- grade III
- grade IV
- grade V
- grade VI

## Photo Categories

- river view
- put-in
- take-out
- parking
- access route
- hazard
- weir
- rapid
- obstruction
- bridge
- lock
- portage
- campsite
- facility
- gauge
- high water
- low water
- wildlife or environment

## Moderation Flags

- inaccurate location
- duplicate
- stale
- unsafe advice
- access dispute
- legal concern
- offensive
- privacy concern
- spam
- needs evidence

## Initial Filters

The map should eventually allow filtering by:

- river section difficulty
- craft suitability
- current level band
- hazards
- access points
- photos
- recently updated
- trusted contributions
- licence/navigation context
- family-friendly sections
- public transport access

