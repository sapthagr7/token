# Offchain RWA Token Platform

A fully off-chain Real-World Asset (RWA) tokenization platform built with React, TypeScript, Express, and PostgreSQL.

## Features

- **Asset Tokenization**: Tokenize real estate, commodities, and loans
- **User Management**: Role-based access control (Admin/Investor)
- **KYC/AML**: Document verification and approval workflow
- **Marketplace**: Buy and sell tokens
- **Admin Dashboard**: Comprehensive analytics and management tools
- **Modern UI**: Built with shadcn/ui and Tailwind CSS

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT with bcrypt

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone git@github.com:sapthagr7/token.git
cd token
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Create a .env file with the following variables:
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
SESSION_SECRET=your-secret-key-here
NODE_ENV=development
PORT=5000
```

4. Run database migrations:
```bash
npm run db:push
```

5. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions on deploying to Render with PostgreSQL.

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run db:push` - Push database schema changes
- `npm run check` - Type check TypeScript

## License

MIT

