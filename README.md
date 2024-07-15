# FAQtiv Desktop

## Prerequisites

- An OpenAI account
- NodeJS 20

## Development

### Installation

To install, clone this repository locally and run:

```bash
git clone https://github.com/geochap/faqtiv-desktop.git
cd faqtiv-desktop
npm install
```

### Run

1. Copy `.env.example` to `.env` and update the environment variables as needed:

```bash
cp .env.example .env
```

2. Start the development server:

```bash
npm run dev
```

## Getting Started

### Registering an Agent

1. Navigate to the Agents page (Go > Agents).
2. Click on "Add agent" to select an existing `faqtiv-agent-toolkit` project directory.
3. Give the agent a name.

Once the agent is registered, you can:

- Review the agent's compiled tasks on this page. These tasks will be available to the desktop assistant to fulfill requests.
- Edit the `desktop_instructions.txt` included in the agent toolkit project. This file allows you to provide additional instructions and context to help the assistant make better use of the available tasks.

### Usage

1. Navigate to the home page.
2. Start a chat with the assistant.
3. Instead of executing individual tasks via command line, now you can ask the assistant for more complex requirements and it will intelligently decide which tasks to use and provide you with a comprehensive answer.
