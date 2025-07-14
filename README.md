# Yoi AI Timeclock

This sample project provides a minimal timeclock application with a simple backend.

## Requirements
- Node.js 18+

## Setup
```bash
npm install
```

## Running
```bash
npm start
```

## Testing
```bash
npm test
```

The server starts on `http://localhost:3000` and serves static `index.html` for basic timeclock functionality. Use PIN `9999` to log in as a manager and view all punches and manage PTO requests.

Employees can punch in/out, request PTO, switch tasks and complete training modules from their dashboard. Managers can see all punches, PTO requests, task logs and training completion for each employee.
The punch endpoint now automatically alternates between "in" and "out" each time it is called.
