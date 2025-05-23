import AdminSidebar from "../components/AdminSidebar";
import { Tabs } from "flowbite-react";
import { customThemeTab } from "../utils/flowbiteCustomThemes";
import ManageDesignations from "../components/ManageDesignations";
import ManageOccupations from "../components/ManageOccupations";

function ManageProfessions() {
  return (
    <div className="flex flex-col md:flex-row">
      {/* Sidebar */}
      <div className="w-full md:w-1/4">
        <AdminSidebar />
      </div>

      {/* Main Section */}
      <div className="w-full md:w-3/4 flex flex-col px-6 py-4">
        <Tabs variant="underline" theme={customThemeTab}>
          <Tabs.Item title="Issue Incharge" active>
            <ManageDesignations />
          </Tabs.Item>
          <Tabs.Item title="Resolvers">
            <ManageOccupations />
          </Tabs.Item>
        </Tabs>
      </div>
    </div>
  );
}

export default ManageProfessions;
