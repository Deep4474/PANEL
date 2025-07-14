# SMS Setup Guide

## Overview
The admin panel now includes SMS functionality that allows you to send messages to all users or custom phone numbers.

## Features
- Send SMS to all users (extracted from order history)
- Send SMS to custom phone numbers
- Character counter (160 character limit)
- SMS history tracking
- Real-time status updates

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Twilio Setup (Optional - for real SMS)
To send actual SMS messages, you'll need a Twilio account:

1. Sign up at [Twilio.com](https://www.twilio.com)
2. Get your Account SID and Auth Token from the Twilio Console
3. Get a Twilio phone number
4. Add these environment variables to your `.env` file:

```env
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

### 3. Demo Mode
If Twilio is not configured, the system will run in demo mode:
- SMS messages will be saved to history as "sent"
- No actual SMS will be sent
- Perfect for testing the interface

### 4. Usage
1. Access the admin panel
2. Click on "SMS" in the sidebar
3. Choose recipients:
   - "All Users" - sends to all phone numbers from order history
   - "Custom Numbers" - enter specific phone numbers (comma-separated)
4. Type your message (max 160 characters)
5. Click "Send SMS"

### 5. SMS History
- All sent SMS are logged in `smsHistory.json`
- View status, recipients, and any errors
- History is displayed in the admin panel

## File Structure
- `admin-panel/admin.html` - SMS interface
- `admin-panel/admin.css` - SMS styling
- `admin-panel/admin.js` - SMS frontend logic
- `server.js` - SMS backend endpoints
- `smsHistory.json` - SMS history storage

## API Endpoints
- `POST /api/sms/send` - Send SMS
- `GET /api/sms/history` - Get SMS history

## Notes
- Phone numbers should be in international format (e.g., +2348012345678)
- Messages are limited to 160 characters
- The system automatically extracts phone numbers from order history
- Failed SMS attempts are logged with error details 