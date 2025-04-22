import React, { useState } from "react";
import InchargeSidebar from "../components/InchargeSidebar";
import { useSelector } from "react-redux";
import { Spinner } from "flowbite-react";

function InchargeProfile() {
  const [loading, setLoading] = useState(false);
  const {currentUser} = useSelector((state: any) => state.user);
  //TODO: add api call for this
  const fetchUser = async () =>{
    setLoading(true);
    try {
        
    } catch (error) {
        
    } finally{
        setLoading(false);
    }
  }
  const getInitials = (name: string) => {
    const nameParts = name.trim().split(" ");
    const initials =
      nameParts.length === 1
        ? nameParts[0][0]
        : nameParts[0][0] + nameParts[nameParts.length - 1][0];
    return initials.toUpperCase();
  };

  //TODO: Complete this UI
  return (
    <div className="flex flex-col md:flex-row">
      {/* Sidebar */}
      <div className="w-full md:w-1/4">
        <InchargeSidebar />
      </div>

      {loading ? (<Spinner size="xl" className="fill-[rgb(60,79,131)]" />) : <div className="w-full md:w-3/4 flex flex-col px-6 py-4">
        Incharge profile
      </div>}
    </div>
  );
}

export default InchargeProfile;
