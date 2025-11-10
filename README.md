# Zonneplan for Homey

Transform your home into a smarter, more sustainable living space with seamless integration of your Zonneplan devices. This app brings all your Zonneplan devices—solar panels, home battery, EV charger, and P1 meter—into Homey for powerful automation and insights.

## Features

### Supported Devices

- **Solar Panels** - Monitor real-time solar energy production
- **Nexus Home Battery** - Track battery status, charging, and discharging
- **EV Charge Points** - Control and schedule your EV charging
- **Connect P1 Meter** - Monitor electricity import and export from the grid

### EV Charging Control

Take full advantage of dynamic charging to optimize costs and sustainability:

- **Dynamic Charging Sessions** - Schedule smart charging with specific goals (kilometers or battery percentage) and end times
- **Boost Charging** - Start immediate charging when needed
- **Charge Modes** - Switch between Always Flex, Plug & Charge, and Start with App modes
- **Powerplay Integration** - Automatically manage flexible smart charging
- **Auto-resume Option** - Automatically resume Powerplay charging after dynamic sessions

### Energy Monitoring

- Real-time power measurements for all devices
- Cumulative energy meters for import, export, and generation
- Battery state of charge tracking
- EV charging state and power consumption

### Flow Cards

Create powerful automations with comprehensive Flow card support:

#### Actions
- Start/stop dynamic charging sessions
- Start boost charging
- Stop charging
- Enable/disable plug & charge mode
- Enable/disable always flex mode
- Set charge mode
- Unsuppress always flex mode

## Installation

### From Homey App Store
1. Open the Homey app
2. Go to "More" → "Apps"
3. Search for "Zonneplan"
4. Install the app

### Development Installation
```bash
# Clone the repository
git clone https://github.com/Bloemendaal/app.bloemendaal.zonneplan.git
cd app.bloemendaal.zonneplan

# Install dependencies
npm install

# Globally install Homey CLI
npm install --global --no-optional homey

# Run the app on your Homey
homey app run
```

## Setup

1. After installing the app, add a device
1. Select the type of Zonneplan device you want to add
1. Enter your Zonneplan email address
1. Check your email and click the confirmation link
1. Select your device(s) from the list

All devices linked to your Zonneplan account will use the same authentication, so you only need to verify your email once per device type.

## Usage Examples

### Smart EV Charging
Create a Flow that starts dynamic charging every weekday evening:
- **When**: Time is 22:00 and it's a weekday
- **And**: EV is plugged in
- **Then**: Start dynamic charging until 07:00, charge 80%

### Solar Energy Optimization
Maximize self-consumption by starting your washing machine when solar production is high:
- **When**: Solar power is greater than 2000W
- **And**: Battery is above 80%
- **Then**: Start washing machine

### Cost Optimization
Automatically stop expensive charging during peak hours:
- **When**: Time is 17:00 (peak rate starts)
- **And**: EV is charging
- **And**: Battery is above 50%
- **Then**: Stop charging

## Requirements

- Homey Pro (Early 2023) or Homey Pro (Early 2019)
- Homey firmware >=12.4.5
- Active Zonneplan account with at least one supported device

## Disclaimer

This project is **not** affiliated with, endorsed by, or associated with Zonneplan B.V. or any of its subsidiaries. "Zonneplan" and related marks are trademarks of Zonneplan B.V. This app is provided as-is, without any warranty. Use at your own risk.

## Changelog

See the [changelog](.homeychangelog.json) for a list of changes in each version.
