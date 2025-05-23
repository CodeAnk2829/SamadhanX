import React, { useState } from "react";
import InchargeSidebar from "../components/InchargeSidebar";
import { Spinner } from "flowbite-react";

function InchargeNotifications() {
  const [loading, setLoading] = useState(false);
  return (
    <div className="flex flex-col md:flex-row">
      {/* Sidebar */}
      <div className="w-full md:w-1/4">
        <InchargeSidebar />
      </div>

      {loading ? (
        <Spinner size="xl" className="fill-[rgb(60,79,131)]" />
      ) : (
        <div className="w-full md:w-3/4 flex flex-col px-6 py-4">
          Incharge Notifications 
        </div>
      )}
    </div>
  );
}

export default InchargeNotifications;
