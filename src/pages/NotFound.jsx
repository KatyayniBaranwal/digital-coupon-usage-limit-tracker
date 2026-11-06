import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="page">
      <div className="card empty">
        <Compass size={44} />
        <h3>Page not found</h3>
        <p style={{ marginBottom: 16 }}>The page you are looking for does not exist.</p>
        <Link to="/dashboard" className="btn btn-primary">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
