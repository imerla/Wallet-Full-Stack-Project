# Demo Guide

This guide provides a structured approach for demonstrating the banking application to lecturers, reviewers, or during presentations.

## 1. Introduction

**What to say:**
"This is a full-stack banking application built with React, TypeScript, NestJS, and MongoDB. It demonstrates modern web development practices including JWT authentication, role-based authorization, real-time chat, and responsive design."

**Key points to mention:**
- Educational project (not real banking)
- Full-stack with separate frontend and backend
- MongoDB database
- JWT-based authentication
- Role-based access control (USER/ADMIN)

## 2. Authentication

**Demonstration Steps:**

1. **Registration**
   - Navigate to `/register`
   - Fill in username, email, password
   - Show form validation
   - Submit and show success message
   - Explain: Password is hashed with bcrypt, wallet is automatically created

2. **Login**
   - Navigate to `/login`
   - Enter credentials
   - Show successful login
   - Explain: JWT token generated and stored in localStorage
   - Redirect to dashboard

**Technical points:**
- JWT token contains userId and role
- Password never returned in API responses
- Protected routes require authentication

## 3. User Experience

**Demonstration Steps:**

1. **Dashboard**
   - Show wallet balance
   - Show recent transactions
   - Show pending money requests
   - Show notification bell with unread count
   - Explain: Data fetched from authenticated API endpoints

2. **Profile**
   - Navigate to Profile
   - Show user information
   - Explain: Data scoped to authenticated user

**Technical points:**
- All API requests include Authorization header
- Backend validates JWT on every request
- Ownership checks prevent data leakage

## 4. Transfers

**Demonstration Steps:**

1. **Send Money**
   - Navigate to "Send Money"
   - Use fuzzy search to find a user
   - Enter amount and description
   - Submit transfer
   - Show success screen with transaction IDs
   - Explain: Atomic database transaction ensures both sender and receiver balances update

2. **Transaction History**
   - Navigate to Transactions
   - Show the new transaction
   - Demonstrate filters (type, status, date range)
   - Show export to CSV functionality

**Technical points:**
- Fuzzy search uses Fuse.js
- Self-transfer blocked by backend
- Balance validation before transfer
- Decimal.js for precise financial calculations
- MongoDB transactions for atomicity

## 5. Transactions

**Demonstration Steps:**

1. **View Transactions**
   - Navigate to Transactions page
   - Show paginated list
   - Demonstrate type filter (income/expense)
   - Demonstrate status filter (completed/pending/cancelled)
   - Demonstrate date range filter
   - Click on a transaction row to open details modal
   - Show full transaction information in modal

2. **Transaction Cancellation**
   - Click on a recent transfer to open details modal
   - Show Cancel button in modal (if within 24 hours)
   - Click Cancel to open confirmation modal
   - Confirm cancellation
   - Explain: Time window validation, balance reversal

**Technical points:**
- Transactions scoped to authenticated user
- Clickable rows open details modal with full information
- Cancellation checks ownership, status, and time window
- Receiver must have sufficient funds for reversal

## 6. Money Requests

**Demonstration Steps:**

1. **Create Request**
   - Navigate to "Request Money"
   - Search for a user
   - Enter amount and description
   - Submit request
   - Show success message

2. **View Requests**
   - Navigate to "Money Requests"
   - Show incoming and outgoing requests
   - Demonstrate accepting a request
   - Demonstrate rejecting a request
   - Show automatic transfer on acceptance

**Technical points:**
- Only requester can cancel
- Only requested user can respond
- State transitions enforced by backend
- Atomic balance updates on acceptance

## 7. Notifications

**Demonstration Steps:**

1. **View Notifications**
   - Click notification bell
   - Show notification dropdown
   - Show unread count
   - Mark notifications as read
   - Navigate from notification to relevant page

**Technical points:**
- Notifications scoped to authenticated user
- Real-time updates via polling
- Mark as read validates ownership

## 8. Support

**Demonstration Steps:**

1. **Open Chat**
   - Navigate to Support Chat
   - Show admin availability status
   - Create conversation
   - Send message
   - Show real-time messaging

2. **Admin Chat** (if admin available)
   - Login as admin
   - Navigate to chat
   - Show user conversations
   - Respond to user message
   - Close conversation

**Technical points:**
- WebSocket for real-time communication
- Role-based access (USER/ADMIN)
- Participant validation
- Conversation ownership checks

## 9. Admin

**Demonstration Steps:**

1. **Login as Admin**
   - Logout as user
   - Login with admin credentials
   - Show admin-specific navigation

2. **User Management**
   - Navigate to admin user list
   - Show all users with wallets
   - Search users
   - View user details

3. **Transaction Monitoring**
   - View all transactions in system
   - Show transaction details

4. **Support Availability**
   - Toggle admin availability
   - Explain: Affects which users can create support conversations

**Technical points:**
- Admin endpoints protected with RolesGuard
- @Roles decorator enforces ADMIN role
- Backend authorization is security boundary
- Frontend role checks are UX only

## 10. Responsive Design

**Demonstration Steps:**

1. **Desktop View**
   - Show full layout at 1280px+
   - Demonstrate navigation, tables, cards

2. **Tablet View**
   - Resize to 768px-1024px
   - Show adaptive layout
   - Demonstrate table scrolling

3. **Mobile View**
   - Resize to 375px-414px
   - Show hamburger menu
   - Demonstrate mobile navigation
   - Show touch-friendly buttons
   - Show responsive tables

**Technical points:**
- Mobile-first CSS
- CSS breakpoints at 320px, 768px, 1024px, 1280px
- Touch targets minimum 44px
- Horizontal scroll for tables on mobile

## 11. Security Highlights

**What to mention:**

- **JWT Authentication**: Stateless tokens with expiration
- **Password Security**: bcrypt hashing, never returned in responses
- **Role-Based Authorization**: Guards protect admin endpoints
- **Ownership Validation**: Users can only access their own data
- **Input Validation**: Class-validator DTOs on all endpoints
- **CORS**: Restricted to specific origin
- **NoSQL Injection Prevention**: ObjectId casting, query sanitization

## 12. Architecture Overview

**What to explain:**

```
Frontend (React + TypeScript)
    ↓ HTTP/WebSocket
Backend API (NestJS + TypeScript)
    ↓
MongoDB Database
```

**Key architectural decisions:**
- REST API for CRUD operations
- WebSocket for real-time chat
- MongoDB for flexible document storage
- JWT for stateless authentication
- Context API frontend state management

## 13. Development Workflow

**What to mention:**

- **Frontend**: Vite for fast development, React Router for routing
- **Backend**: NestJS CLI, watch mode for hot reload
- **TypeScript**: Type safety across full stack
- **ESLint**: Code quality enforcement
- **Git**: Version control with .gitignore for secrets

## 14. Conclusion

**What to say:**

"This application demonstrates a complete full-stack banking system with authentication, authorization, real-time features, and responsive design. The codebase follows best practices for security, type safety, and user experience."

**Key takeaways:**
- Full-stack development with React and NestJS
- Secure authentication with JWT
- Role-based authorization
- Real-time features with WebSocket
- Responsive design for all devices
- Clean code with TypeScript

## Tips for Demo

- **Practice**: Run through the demo flow before presentation
- **Data**: Have test users ready with different roles
- **Network**: Ensure backend and MongoDB are running
- **Browser**: Use Chrome DevTools to show network requests if helpful
- **Time**: Keep demo under 10-15 minutes for presentations
- **Focus**: Emphasize security and architecture over UI
- **Backup**: Have screenshots ready in case of technical issues
