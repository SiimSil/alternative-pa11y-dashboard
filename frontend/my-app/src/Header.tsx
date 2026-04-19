import { Link } from "react-router";
import './Header.css'

function Header() {
    return (
        <header className="header-container">
            <h1 className="header-h1">Alternative Pa11y Dashboard</h1>
            <Link to="/scans">Scans</Link>
        </header>
    )
}

export default Header;