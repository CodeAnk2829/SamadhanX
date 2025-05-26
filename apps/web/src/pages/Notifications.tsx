import React, { useCallback, useEffect, useState } from "react";
import SideBar from "../components/SideBar";
import { useSelector } from "react-redux";
import { Button, Spinner } from "flowbite-react";
import NotificationCard from "../components/NotificationCard";
import { useComplaintWebSocket } from "../hooks/useComplaintWebSocket";
import dayjs from "dayjs";

export type ComplaintDetails = {
  complaintId: string;
  title: string;
  isAssignedTo?: string; //ASSIGNED
  designation?: string; //ASSIGNED
  delegatedTo?: string; //DELEGATED
  delegatedBy?: string; //DELEGATED
  occupation?: string; //DELEGATED
  isEscalatedTo?: string; //ESCALATED
  resolvedBy?: string; //RESOLVED
};
export type Notification = {
  id: string;
  eventType: string;
  createdAt: string;
  isRead: boolean;
  payload: ComplaintDetails;
};

const filters = [
  "ALL",
  "ASSIGNED",
  "CLOSED",
  "DELEGATED",
  "ESCALATED",
  "RESOLVED",
  "RERAISED",
];

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const { currentUser } = useSelector((state) => state.user);
  const [selectedFilter, setSelectedFilter] = useState("ALL");
  const [loading, setLoading] = useState(false);

  useComplaintWebSocket((wsMessage) => {
    if (!wsMessage?.data || wsMessage.data.complainerId !== currentUser.id)
      return;

    let newNotification = null;
    const { type, data, idemPotencyKey } = wsMessage;

    switch (type) {
      case "ASSIGNED":
        newNotification = {
          id: idemPotencyKey,
          eventType: type,
          createdAt: new Date().toISOString(),
          isRead: false,
          payload: {
            complaintId: data.complaintId,
            title: data.title,
            isAssignedTo: data.isAssignedTo,
          },
        };
        break;

      case "DELEGATED":
        newNotification = {
          id: idemPotencyKey,
          eventType: type,
          createdAt: new Date().toISOString(),
          isRead: false,
          payload: {
            complaintId: data.complaintId,
            title: data.title,
            delegatedTo: data.delegatedTo,
            delegatedBy: data.resolverName,
            occupation: data.occupation,
          },
        };
        break;

      case "ESCALATED":
        newNotification = {
          id: idemPotencyKey,
          eventType: type,
          createdAt: new Date().toISOString(),
          isRead: false,
          payload: {
            complaintId: data.complaintId,
            title: data.title,
            isEscalatedTo: data.inchargeName,
          },
        };
        break;

      case "RESOLVED":
        newNotification = {
          id: idemPotencyKey,
          eventType: type,
          createdAt: new Date().toISOString(),
          isRead: false,
          payload: {
            complaintId: data.complaintId,
            title: data.title,
            resolvedBy: data.inchargeName,
          },
        };
        break;

      case "CLOSED":
      case "RERAISED":
      case "DELETED":
      case "CREATED":
      case "UPDATED":
      case "RECREATED":
      case "UPVOTED":
        newNotification = {
          id: idemPotencyKey,
          eventType: type,
          createdAt: dayjs().tz("Asia/Kolkata").format(),
          isRead: false,
          payload: {
            complaintId: data.complaintId,
            title: data.title,
          },
        };
        break;

      default:
        console.warn("Unhandled WS type: ", type);
    }

    if (newNotification) {
      setNotifications((prev) => {
        const alreadyExists = prev.some(
          (notif) =>
            notif.payload.complaintId === newNotification.payload.complaintId &&
            notif.eventType === newNotification.eventType
        );
        if (alreadyExists) return prev;
        return [newNotification, ...prev];
      });
    }
    
  });

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/v1/user/me/notifications?eventType=${selectedFilter}`
      );
      const data = await res.json();
      console.log(data);
      if (data.ok) {
        setNotifications(data.notifications);
      }
    } catch (error) {
      console.log(error.message);
    } finally {
      setLoading(false);
    }
  }, [selectedFilter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return (
    <div className="flex flex-col md:flex-row">
      {/* Sidebar */}
      <div className="w-full md:w-1/4">
        <SideBar />
      </div>

      {/* Main Section */}
      <div className="w-full md:w-3/4 flex flex-col px-6 py-4">
        <h2 className="text-2xl font-bold mb-4">Notifications</h2>
        <div className="flex gap-2 flex-wrap mb-4">
          {filters.map((filter) => (
            <Button
              key={filter}
              onClick={() => setSelectedFilter(filter)}
              color={selectedFilter === filter ? "purple" : "gray"}
            >
              {filter}
            </Button>
          ))}
        </div>
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <Spinner size="xl" className="fill-[rgb(60,79,131)]" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                />
              ))
            ) : (
              <div>No notifications</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Notifications;
