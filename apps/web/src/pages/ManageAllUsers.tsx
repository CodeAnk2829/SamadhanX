import React, { useEffect } from "react";
import AdminSidebar from "../components/AdminSidebar";
import { Tabs } from "flowbite-react";
import ManageUsers from "../components/ManageUsers";
import ManageIssueIncharge from "../components/ManageIssueIncharge";
import ManageResolvers from "../components/ManageResolvers";
import { customThemeTab } from "../utils/flowbiteCustomThemes";

function ManageAllUsers() {
  return (
    <div className="flex flex-col md:flex-row">
      {/* Sidebar */}
      <div className="w-full md:w-1/4">
        <AdminSidebar />
      </div>

      {/* Main Section */}
      <div className="w-full md:w-3/4 flex flex-col px-6 py-4">
        <Tabs variant="underline" theme={customThemeTab}>
          <Tabs.Item title="Users" active>
            <ManageUsers />
          </Tabs.Item>
          <Tabs.Item title="Issue Incharge">
            <ManageIssueIncharge />
          </Tabs.Item>
          <Tabs.Item title="Resolvers">
            <ManageResolvers />
          </Tabs.Item>
        </Tabs>
      </div>
    </div>
  );
}

export default ManageAllUsers;
