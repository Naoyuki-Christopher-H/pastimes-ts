# Pastimes

Pastimes is a web application for buying and selling second-hand branded clothing in good condition. Customers browse and buy clothing, vendors offer clothing for sale, and an administrator approves accounts and manages the store.

This document describes the purpose of the application, its current status, how to install and run it, and how it is organised.

## Table of Contents

1. [Disclaimer](#disclaimer)
2. [Project Status](#project-status)
3. [Overview](#overview)
4. [Features](#features)
   1. [Available Now](#available-now)
   2. [Planned](#planned)
5. [User Roles](#user-roles)
   1. [Customer](#customer)
   2. [Vendor](#vendor)
   3. [Administrator](#administrator)
6. [Account Approval Process](#account-approval-process)
7. [Technology Stack](#technology-stack)
8. [Getting Started](#getting-started)
   1. [Prerequisites](#prerequisites)
   2. [Installation](#installation)
   3. [Running the Application](#running-the-application)
   4. [Available Commands](#available-commands)
9. [Project Structure](#project-structure)
10. [Data Model](#data-model)
11. [Security](#security)
12. [Default Administrator Account](#default-administrator-account)
13. [Screenshots and Media](#screenshots-and-media)
14. [Testing](#testing)
15. [Known Limitations](#known-limitations)
16. [Contributing](#contributing)
17. [Support](#support)

## Disclaimer

UNDER NO CIRCUMSTANCES SHOULD IMAGES OR EMOJIS BE INCLUDED DIRECTLY IN THE README FILE. ALL VISUAL MEDIA, INCLUDING SCREENSHOTS AND IMAGES OF THE APPLICATION, MUST BE STORED IN A DEDICATED FOLDER WITHIN THE PROJECT DIRECTORY. THIS FOLDER SHOULD BE CLEARLY STRUCTURED AND NAMED ACCORDINGLY TO INDICATE THAT IT CONTAINS ALL VISUAL CONTENT RELATED TO THE APPLICATION (FOR EXAMPLE, A FOLDER NAMED IMAGES, SCREENSHOTS, OR MEDIA). I AM NOT LIABLE OR RESPONSIBLE FOR ANY MALFUNCTIONS, DEFECTS, OR ISSUES THAT MAY OCCUR AS A RESULT OF COPYING, MODIFYING, OR USING THIS SOFTWARE. IF YOU ENCOUNTER ANY PROBLEMS OR ERRORS, PLEASE DO NOT ATTEMPT TO FIX THEM SILENTLY OR OUTSIDE THE PROJECT. INSTEAD, KINDLY SUBMIT A PULL REQUEST OR OPEN AN ISSUE ON THE CORRESPONDING GITHUB REPOSITORY, SO THAT IT CAN BE ADDRESSED APPROPRIATELY BY THE MAINTAINERS OR CONTRIBUTORS.

## Project Status

Pastimes is a prototype under active development. The storefront and the database are in place. Registration, login, and the administrator and account pages are not yet built. See [Features](#features) and [Known Limitations](#known-limitations) for details.

## Overview

Pastimes connects people who want to sell quality second-hand clothing with people who want to buy it. Every account is reviewed by an administrator before it can trade. This review protects buyers and sellers and keeps the quality of listings high.

The main goals of the application are:

- Make it simple to browse and buy second-hand branded clothing.
- Give vendors a clear way to offer clothing for sale.
- Give the administrator full control over accounts, listings, orders, and communication.

## Features

### Available Now

- **Storefront.** A home page with a product gallery showing the brand, size, condition, price in South African rand, and seller of each item.
- **Shopping cart.** Customers add items, change quantities, remove items, and see a running total. The cart is held in the browser only and is cleared when the page reloads.
- **Message a seller.** A form for writing a message to the seller of an item. Messages are not yet saved.
- **Sell with Pastimes.** A form where a prospective vendor describes an item for review. Submissions are not yet saved.
- **Database.** Storage for accounts, roles, listings, carts, orders, messages, and announcements, with access rules for each.
- **File storage.** A private area for identity documents, readable only by administrators, and a private area for clothing photographs.

### Planned

- Registration with Full Name, Username, Email, Password, and Confirm Password, plus a choice of Customer or Vendor and an identity document upload.
- Login by username and password, with a clear message for accounts that are awaiting approval.
- An administrator page for reviewing documents, approving or rejecting accounts, approving listings, marking items as sold, updating delivery status, reading messages, and posting announcements.
- An account page for delivery details, order history, messages, and vendor listings.
- A storefront that reads listings from the database.

## User Roles

### Customer

A customer browses clothing, adds items to a cart, buys items, enters delivery details, and sends messages to sellers. A customer can trade only after the administrator approves the account.

### Vendor

A vendor has all customer abilities and can also submit clothing for sale. Each listing is reviewed by the administrator before it becomes visible in the store.

### Administrator

The administrator approves or rejects accounts, reviews identity documents, approves and removes listings, manages orders and deliveries, reads all messages, and sends announcements to all users.

## Account Approval Process

1. A new user registers as a customer or a vendor and uploads an identity document.
2. The account is created with the status **Pending**.
3. The administrator reviews the details and the document.
4. The administrator sets the status to **Approved** or **Rejected**.
5. Only approved users can add to a cart, buy, send messages, or list clothing. The database enforces this rule, so it cannot be bypassed from the browser.

## Technology Stack

| Area | Technology |
| --- | --- |
| Framework | TanStack Start (React 19) |
| Build tool | Vite 7 |
| Styling | Tailwind CSS 4 |
| Language | TypeScript |
| Backend | Lovable Cloud (PostgreSQL database, authentication, file storage) |
| Testing | Vitest |

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) version 1.1 or later.
- A connected Lovable Cloud backend. The connection settings are provided in the `.env` file.

### Installation

```bash
git clone <repository-url>
cd pastimes
bun install
```

### Running the Application

```bash
bun run dev
```

The application opens at `http://localhost:8080`.

### Available Commands

| Command | Purpose |
| --- | --- |
| `bun run dev` | Starts the development server. |
| `bun run build` | Creates a production build. |
| `bun run preview` | Serves the production build locally. |
| `bun run lint` | Checks the code for style and quality issues. |
| `bun run format` | Formats the code. |
| `bun run test` | Runs the automated tests once. |

## Project Structure

```text
.
|-- drizzle/migrations/      Database setup scripts
|-- public/                  Static files served as they are
|-- screenshots/             All screenshots and visual media for documentation
|-- src/
|   |-- assets/              Images used by the application
|   |-- components/ui/       Reusable interface components
|   |-- integrations/        Backend connection (generated, do not edit)
|   |-- lib/shop.ts          Sample listings and cart calculations
|   |-- routes/              One file per page
|   |-- styles.css           Colours, fonts, and design settings
|   `-- test/                Automated tests
|-- AGENTS.md                Technical decisions for contributors
`-- README.md                This document
```

## Data Model

| Table | Purpose |
| --- | --- |
| `profiles` | Name, username, email, account type, approval status, document, and delivery address for each user. |
| `user_roles` | Roles such as administrator, stored separately from profiles to prevent users from granting themselves rights. |
| `items` | Clothing listings with brand, size, condition, price, photo, and status (pending, available, or sold). |
| `cart_items` | Items each user has placed in their cart. |
| `orders` | Purchases, including price, delivery address, and delivery status (placed, shipped, or delivered). |
| `messages` | Messages between buyers, sellers, and the administrator. |
| `announcements` | Notices from the administrator to all users. |

When an order is placed, the database checks that the item is still available, marks it as sold, and removes it from every cart. This prevents the same item from being sold twice.

## Security

- Row-level security is enabled on every table. Each user can read and change only their own data. Administrators have wider access.
- Users cannot change their own approval status, account type, username, or email.
- Administrator rights are stored in a separate roles table and checked by the database.
- Identity documents are stored privately and are readable only by administrators.

## Default Administrator Account

A master administrator account is created when the database is first set up.

| Field | Value |
| --- | --- |
| Username | `Admin` |
| Password | `Ad!min@123` |

**Important:** This password is public in this document and in the database setup script. Change it before the application is used with real customers.

## Screenshots and Media

All screenshots and visual media for this project are stored in the [`screenshots`](screenshots/) folder. Images must not be placed directly in this README.

## Testing

Run the automated tests with:

```bash
bun run test
```

The current tests confirm that the application's pages load correctly.

## Known Limitations

- Registration and login are not yet available.
- The storefront uses built-in sample listings, not the database.
- The cart, messages, and sell form are not saved.
- The six sample listings share three photographs.

## Contributing

1. Fork the repository and create a branch for your change.
2. Keep changes focused and follow the existing code style.
3. Run `bun run lint` and `bun run test` before submitting.
4. Open a pull request that describes what you changed and why.

## Support

If you find a problem, open an issue on the GitHub repository. Include the steps to reproduce it, what you expected to happen, and what happened instead.
