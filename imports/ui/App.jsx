import { TableBooking } from "./TableBooking.jsx";
import { Header } from "./Header.jsx";
import { Info } from "./Info.jsx";
import { Button } from "@mui/material";
import { BrowserRouter, Routes, Route }from "react-router";
import Admin from "./Admin.jsx";
export const App = () => ( 
<BrowserRouter>
  
    <div className="page">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
      <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap"
      /><link
        rel="stylesheet"
        href="https://fonts.googleapis.com/icon?family=Material+Icons"
      />
      <Routes>
        <Route path="/booking" element={<TableBooking />} />
        <Route path="/admin" element={<Admin/>}/>
        <Route path="/" element={<Info />} />
      </Routes>
    </div>
  </BrowserRouter>
);
