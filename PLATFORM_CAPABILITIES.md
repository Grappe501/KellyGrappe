Platform Capability System

This document defines the capability unlock system used by the Civic Operations Platform.

The platform is designed to allow individuals to grow into leadership roles through participation and organizing, rather than relying solely on static role assignments.

Capabilities unlock as users gain experience, training, and network participation.

1. Capability vs Role

Roles define permission boundaries.

Capabilities define tools a user can access.

Example:

Role:
Precinct Captain

Capabilities:

manage precinct volunteers

create precinct events

run phone bank sessions

assign canvassing turf

Capabilities may be unlocked before a formal role is assigned.

This allows leadership development inside the platform.

2. Capability Categories

Capabilities are grouped into several categories.

Organizing

Tools used to build networks.

Examples:

create group

manage group members

invite organizers

manage precinct teams

build organizing trees

Messaging

Communication tools.

Examples:

send SMS

send broadcast email

create messaging templates

schedule messaging campaigns

Fundraising

Donation and financial tools.

Examples:

call time dashboard

donor pipeline access

pledge tracking

recurring donor management

Field Operations

Field campaign tools.

Examples:

canvassing turf assignment

volunteer shift scheduling

event staffing management

field reporting dashboards

Social Amplification

Volunteer media network tools.

Examples:

connect personal social accounts

receive campaign content

schedule social posts

amplify campaign messaging

AI Assistance

AI-supported capabilities.

Examples:

generate message drafts

summarize field reports

generate dashboards

produce strategy insights

3. Capability Unlock Methods

Capabilities can unlock through several mechanisms.

Training Completion

Example:

Completing the "Neighborhood Organizer Training" unlocks:

neighborhood group creation

event coordination tools

Network Size

Example:

After building a Power of 5 group, additional tools unlock.

Leadership Nomination

Example:

A county leader may nominate a user for Precinct Captain tools.

Participation Metrics

Example:

volunteer hours

events organized

contacts made

supporters recruited

4. Organizing Ladder

The platform supports a leadership growth ladder.

Example progression:

Citizen
Power of 5 Organizer
Neighborhood Organizer
Precinct Organizer
Precinct Captain
County Organizer
Regional Organizer
State Organizer

Each stage unlocks additional capabilities.

5. Capability Flags

Capabilities are controlled through feature flags and capability flags.

Example structure:

capabilities/

organizing.createGroup
organizing.manageGroup
field.assignTurf
messaging.broadcastSMS
fundraising.callTime
social.connectAccount
ai.generateStrategy

Cards must check capability flags before enabling advanced features.

6. Platform Philosophy

The capability system enables:

• bottom-up leadership development
• distributed organizing networks
• grassroots empowerment

Instead of requiring centralized role assignments, the platform allows people to grow into leadership organically.

End Platform Capability System