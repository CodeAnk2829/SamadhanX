import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";

const RoleBasedRoute = () => {
  const { currentUser } = useSelector((state: any) => state.user);

  if (!currentUser) {
    return <Navigate to="/sign-in" replace />;
  }

  // Role-based redirection
  switch (currentUser.role) {
    case "STUDENT":
    case "FACULTY":
      return <Navigate to="/" replace />;
    case "ISSUE_INCHARGE":
      return <Navigate to="/incharge/complaints" replace />;
    case "ADMIN":
      return <Navigate to="/admin/dashboard" replace />;
    default:
      return <Navigate to="/not-authorized" replace />;
  }
};

export default RoleBasedRoute;
