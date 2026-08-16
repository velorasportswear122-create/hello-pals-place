# Plan - Appointments, Chat, and Reporting Improvements

Add appointment booking, internal chat between users and admin, CSV/PDF report export, and manual subscription activation flow.

## User Improvements
- **Appointment Booking**: 
    - Add `preferred_appointment` (text/datetime) to `contact_requests` table.
    - Update `PropertyPage` to collect appointment time when sending a request.
    - Update `RequestsPage` to show the chosen appointment and its confirmation status.
- **Internal Chat**:
    - Create `messages` table: `id`, `request_id`, `sender_id`, `content`, `created_at`.
    - Enable RLS: Users can see messages for their own requests; Admins can see all.
    - Create `ChatDialog` component for the user-admin conversation.
    - Add chat entry point in `RequestsPage` (for users) and `AdminPage` (for admin) once a request is "accepted" or "reviewing".
- **Manual Subscription**:
    - Update `SubscribePage` to allow uploading an image (receipt) for manual payments.
    - Add `receipt_url` to `subscriptions` table.

## Admin Improvements
- **Request Management**:
    - Update `AdminPage` to show preferred appointment times and allow confirming them.
    - Add chat interface to respond to user inquiries for specific requests.
- **Earnings Reports**:
    - Add "Export Report" button in `AdminPage` stats section.
    - Implement CSV export for property listings (title, type, price, commission) and subscriptions.
    - Use `jspdf` and `jspdf-autotable` for PDF generation if possible, or provide a clean printable view.
- **Manual Subscription Activation**:
    - Update `AdminPage` (Subs tab) to show uploaded receipts.
    - Add "Approve" button to activate the subscription based on the receipt.

## Technical Details
- **Database**:
    - Migration to add `preferred_appointment` to `contact_requests`.
    - Migration to add `receipt_url` to `subscriptions`.
    - Migration to create `messages` table with RLS and triggers for notifications.
- **Dependencies**:
    - `papaparse` for CSV generation.
    - `jspdf` and `jspdf-autotable` for PDF generation.
- **Security**:
    - RLS policies ensure chat messages are private between the requester and admin.
    - Admin-only access for export functions.
