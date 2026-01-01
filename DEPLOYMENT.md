# Deployment Guide for Render

This guide will help you deploy the Offchain RWA Token application to Render with PostgreSQL.

## Prerequisites

1. A GitHub account
2. A Render account (sign up at [render.com](https://render.com))
3. Your code pushed to a GitHub repository

## Step 1: Push Code to GitHub

If you haven't already, push your code to a GitHub repository:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-github-repo-url>
git push -u origin main
```

## Step 2: Create PostgreSQL Database on Render

1. Log in to your Render dashboard
2. Click "New +" and select "PostgreSQL"
3. Configure the database:
   - **Name**: `rwa-token-db` (or your preferred name)
   - **Database**: `rwa_token`
   - **User**: `rwa_token_user`
   - **Plan**: Free (or choose a paid plan for production)
4. Click "Create Database"
5. Wait for the database to be provisioned
6. Copy the **Internal Database URL** (you'll need it later)

## Step 3: Deploy Web Service

### Option A: Using render.yaml (Recommended)

1. The `render.yaml` file in the root directory contains the deployment configuration
2. In Render dashboard, click "New +" and select "Blueprint"
3. Connect your GitHub repository
4. Render will automatically detect the `render.yaml` file and create both the database and web service
5. Review the configuration and click "Apply"

### Option B: Manual Deployment

1. In Render dashboard, click "New +" and select "Web Service"
2. Connect your GitHub repository
3. Configure the service:
   - **Name**: `rwa-token-app` (or your preferred name)
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free (or choose a paid plan for production)
4. Add Environment Variables:
   - `NODE_ENV`: `production`
   - `DATABASE_URL`: (Use the Internal Database URL from Step 2, or link the database service)
   - `SESSION_SECRET`: Generate a secure random string (see below)
   - `PORT`: Render sets this automatically, but you can set it to `10000`
5. Click "Create Web Service"

## Step 4: Generate SESSION_SECRET

Generate a secure random string for `SESSION_SECRET`:

```bash
openssl rand -base64 32
```

Or use an online generator. This secret is used to sign JWT tokens, so it must be kept secure.

## Step 5: Database Migrations

After deployment, you'll need to run database migrations. You can do this via Render's Shell:

1. Go to your web service in Render dashboard
2. Click on "Shell" tab
3. Run: `npm run db:push`

Alternatively, you can add a post-deploy script to `package.json` (not included by default to avoid accidental migrations).

## Step 6: Verify Deployment

1. Wait for the build to complete (this may take 5-10 minutes)
2. Visit your application URL (provided by Render)
3. Test the registration and login functionality

## Environment Variables

The following environment variables are required:

- `DATABASE_URL`: PostgreSQL connection string (automatically set if database is linked)
- `SESSION_SECRET`: Secret key for JWT token signing (generate a secure random string)
- `NODE_ENV`: Set to `production`
- `PORT`: Server port (Render sets this automatically)

## Troubleshooting

### Build Fails

- Check build logs in Render dashboard
- Ensure all dependencies are in `package.json`
- Verify Node.js version compatibility (the app uses Node 20)

### Database Connection Errors

- Verify `DATABASE_URL` is set correctly
- For Render PostgreSQL, use the **Internal Database URL** (not External)
- Ensure the database service is running

### Static Files Not Found

- Verify the build completed successfully
- Check that `dist/public` directory exists after build
- Review build logs for any errors

### Application Crashes on Start

- Check logs in Render dashboard
- Verify all environment variables are set
- Ensure database migrations have been run

## Updating the Application

1. Push changes to your GitHub repository
2. Render will automatically detect changes and trigger a new deployment
3. Monitor the deployment logs in the Render dashboard

## Production Considerations

1. **Upgrade Plans**: The free tier has limitations. Consider upgrading for production:
   - Web Service: Starter ($7/month) or higher
   - PostgreSQL: Starter ($7/month) or higher

2. **Custom Domain**: Add your custom domain in Render dashboard under your web service settings

3. **SSL/HTTPS**: Render provides free SSL certificates automatically

4. **Environment Variables**: Keep sensitive values secure and never commit them to Git

5. **Database Backups**: Enable automatic backups for your PostgreSQL database (available on paid plans)

6. **Monitoring**: Set up health checks and monitoring alerts in Render dashboard

7. **Scaling**: Configure auto-scaling if needed (available on paid plans)

## Support

For issues specific to:
- **Render**: Check [Render documentation](https://render.com/docs)
- **Application**: Review application logs in Render dashboard

