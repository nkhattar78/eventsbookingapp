# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Event Booking Frontend

This app provides a UI for managing events and bookings against a backend running on `http://localhost:8000`.

### Features
- List events
- Create new event
- View event details (with available tickets)
- List bookings for an event
- Create a booking (decrementing available tickets client-side)

### Tech
- React + Vite
- Material UI (MUI)
- Fetch API for backend integration
- React Router v6

### Running
Ensure the backend server is running on port 8000, then start the dev server:

```
npm install
npm run dev
```

Open the URL shown in the terminal (e.g. http://localhost:5174/).

### API Assumptions
The backend exposes:
- `GET /events` -> array of events `{ id, title, description, date_time, location, image_url, total_tickets, available_tickets }`
- `POST /events` -> create event
- `GET /bookings` -> returns all bookings (frontend filters by `event_id`)
- `POST /bookings` -> create booking `{ event_id, customer_name, customer_email, quantity }`

### Environment Config
If the backend URL changes, edit `src/api/index.js` and update `BASE_URL`.

### Image Upload / URL
You can attach an image to an event either by:
1. Providing a direct image URL
2. Uploading a local image file (converted to a Base64 data URL and stored in `image_url` field)

Note: Storing large images as Base64 in the database increases size ~33%. For production consider uploading to object storage (S3, etc.) and storing the URL instead.

### Next Improvements
- Add server-side route for `GET /bookings?event_id=:id`
- Client-side pagination for large booking lists
- Form validation improvements
- Better error boundary UI
