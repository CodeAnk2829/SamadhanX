import React from "react";
import { useSelector } from "react-redux";
import { Navigate, Outlet } from "react-router-dom";

function PrivateRoute() {
  const { currentUser } = useSelector((state) => state.user); // Get the currentUser

  if (currentUser && currentUser.role === "ISSUE_INCHARGE") {
    return <Navigate to="/incharge/complaints" replace />;
  }

  if (currentUser && currentUser.role === "ADMIN") {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return currentUser.role === "STUDENT" || currentUser.role === "FACULTY" ? <Outlet /> : <Navigate to="sign-in" />;
}

export default PrivateRoute;
