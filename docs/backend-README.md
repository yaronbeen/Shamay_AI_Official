# SHAMAY.AI Express Backend

Professional Express.js backend server for SHAMAY.AI property valuation platform.

## Quick Start

```bash
# Setup environment
./setup-backend-env.sh

# Install dependencies
npm install

# Start development server
npm run dev

# Start production server
npm start
```

Server runs on **http://localhost:3001**

## API Endpoints

### Health Check
- `GET /health` - Server health status

### Sessions
- `POST /api/sessions` - Handle all session operations
  - Actions: `save_to_db`, `load_from_db`, `save_gis_data`, `save_garmushka`, etc.
- `GET /api/sessions/:sessionId` - Get session by ID

### Valuations
- `GET /api/valuations` - List/search valuations
- `GET /api/valuations/:id` - Get single valuation
- `POST /api/valuations` - Create valuation
- `PUT /api/valuations/:id` - Update valuation
- `DELETE /api/valuations/:id` - Delete valuation

### Files
- `POST /api/files/:sessionId/upload` - Upload file
- `GET /api/files/:sessionId` - List session files
- `DELETE /api/files/:sessionId/:fileId` - Delete file

### Garmushka
- `POST /api/garmushka/:sessionId` - Save measurements
- `GET /api/garmushka/:sessionId` - Get measurements

## Environment Variables

See `env.example` or run `./setup-backend-env.sh`

## Database

Uses PostgreSQL with connection pooling (pg):
- Min connections: 2
- Max connections: 10
- Database: `shamay_land_registry`

## Logging

Winston logger with:
- Console output (development)
- File output (`logs/` directory)
- Error logging
- Request logging (Morgan)

## Security

- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing
- **Rate Limiting** - 100 requests per 15 minutes
- **Compression** - Response compression

## File Uploads

- **Multer** for file handling
- Max file size: 50MB
- Allowed types: PDF, JPEG, PNG, GIF
- Storage: `uploads/:sessionId/`

## Development

```bash
npm run dev  # Starts with nodemon (auto-reload)
```

## Production

```bash
npm start  # Starts with node
```

## Testing

```bash
# Health check
curl http://localhost:3001/health

# Test session save
curl -X POST http://localhost:3001/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"action": "save_to_db", "sessionId": "test", "valuationData": {}}'
```

## Project Structure

```
backend/
├── src/
│   ├── server.js          # Main server
│   ├── config/
│   │   ├── database.js    # DB connection pool
│   │   └── logger.js      # Winston logger
│   ├── models/
│   │   └── ShumaDB.js     # Database model
│   └── routes/
│       ├── sessions.js    # Session routes
│       ├── valuations.js  # Valuation CRUD
│       ├── files.js       # File uploads
│       └── garmushka.js   # Measurements
├── logs/                  # Log files
└── uploads/               # Uploaded files
```

## Dependencies

- **express** - Web framework
- **pg** - PostgreSQL client
- **cors** - CORS middleware
- **helmet** - Security headers
- **multer** - File uploads
- **winston** - Logging
- **morgan** - HTTP request logging
- **compression** - Response compression
- **express-rate-limit** - Rate limiting

## License

Copyright © 2024 SHAMAY.AI

