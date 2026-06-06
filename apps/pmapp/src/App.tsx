import { UserApp } from './userapp/app/UserApp';
import './App.css';
import { BrowserRouter } from 'react-router-dom';
export default function App() {
  return (
    <BrowserRouter>
      <UserApp />
    </BrowserRouter>
  );
}
