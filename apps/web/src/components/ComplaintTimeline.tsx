import { Timeline } from "flowbite-react";
import {
  FaClipboardList,
  FaArrowUp,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa";
import { customThemeTimeline } from "../utils/flowbiteCustomThemes";

const statusIcons = {
  Created: FaClipboardList,
  Assigned: FaArrowUp,
  Escalated: FaArrowUp,
  Delegated: FaArrowUp,
  Resolved: FaCheckCircle,
  Feedback: FaCheckCircle,
  Closed: FaTimesCircle,
};

function ComplaintTimeline({ timelineData }) {
  return (
    <div className="pt-6 h-[80vh]">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
        Complaint Progress
      </h2>
      <Timeline theme={customThemeTimeline}>
        <div className={`grid gap-6 justify-center`}
          // style={{
          //   gridTemplateColumns: `repeat(4, minmax(250px, 1fr))`,
          // }}
      >
          {timelineData.map((event, index) => (
            <Timeline.Item key={index} className="flex flex-col">
              <Timeline.Point
                icon={statusIcons[event.status] || FaClipboardList}
              />
              <Timeline.Content>
                <Timeline.Time className="text-gray-600">
                  {event.timestamp}
                </Timeline.Time>
                <Timeline.Title className="font-semibold">
                  {event.status}
                </Timeline.Title>
                <Timeline.Body className="text-gray-700 text-sm">
                  {event.description}
                  {event.assignedTo && (
                    <p className="mt-2">
                      <strong>Assigned to:</strong> {event.assignedTo} (
                      {event.designation})
                    </p>
                  )}
                  {event.location && (
                    <p>
                      <strong>Location:</strong> {event.location}
                    </p>
                  )}
                  {event.expiry && (
                    <p>
                      <strong>Expires at:</strong> {event.expiry}
                    </p>
                  )}
                </Timeline.Body>
              </Timeline.Content>
            </Timeline.Item>
          ))}
        </div>
      </Timeline>
    </div>
  );
}

export default ComplaintTimeline;
