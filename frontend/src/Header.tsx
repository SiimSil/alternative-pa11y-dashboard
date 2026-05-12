import { NavLink } from "react-router";
import './Header.css'

function Header() {
    return (
        <header className="header-container">
            <h1 className="header-h1">A11yAtlas</h1>
            <NavLink className={({isActive}) => isActive ? 'active' : 'nonActive'} to="/">Scans</NavLink>
            <NavLink className={({isActive}) => isActive ? 'active' : 'nonActive'} to="/stats">Statistics</NavLink>
        </header>
    )
}

export default Header;