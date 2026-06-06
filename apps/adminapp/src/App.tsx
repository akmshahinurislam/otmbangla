import { AdminApp } from './adminapp/app/AdminApp';
import './App.css';
import { BrowserRouter } from 'react-router-dom';

export default function App() {
  return (
    <BrowserRouter>
      <AdminApp />
    </BrowserRouter>
  );
}
