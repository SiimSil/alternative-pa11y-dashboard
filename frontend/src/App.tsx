import './App.css'
import { Outlet } from 'react-router'
import Header from './Header.tsx'

function App() {
  return (
    <>
      <Header />
      <Outlet />
    </>
  )
}

export default App
