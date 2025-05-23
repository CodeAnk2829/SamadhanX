import { Badge, Button, Tooltip } from "flowbite-react";
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import moment from "moment-timezone";
import { BiSolidUpvote, BiUpvote } from "react-icons/bi";
import Lightbox from "yet-another-react-lightbox";
import Inline from "yet-another-react-lightbox/plugins/inline";
import "yet-another-react-lightbox/styles.css";
import statusColors from "../utils/statusColors";

interface Attachment {
  id: string;
  imageUrl: string;
}

interface ComplaintDetails {
  actionTaken: boolean;
  upvotes: number;
}

interface User {
  userId: string;
  name: string;
}

interface Tags {
  tagName: string;
}

interface Complaint {
  id: string;
  title: string;
  description: string;
  access: string;
  userId: string;
  user: User;
  createdAt: string;
  status: string;
  attachments: Attachment[];
  complaintDetails: ComplaintDetails;
  postAsAnonymous: boolean;
  tags: Tags[];
}

interface IssueInchargeComplaintCardProps {
  complaint: Complaint;
  showProfile: boolean;
  showBadges: boolean;
  onResolve?: (id: string) => void; //may change
  onDelegate?: (complaint: Complaint) => void; //may change
  onEscalate?: (id: string) => void; //may change
}

const getInitials = (name: string): string => {
  const nameParts = name.trim().split(" ");
  const initials =
    nameParts.length === 1
      ? nameParts[0][0]
      : nameParts[0][0] + nameParts[nameParts.length - 1][0];
  return initials.toUpperCase();
};

const IssueInchargeComplaintCard: React.FC<IssueInchargeComplaintCardProps> = ({
  complaint,
  showProfile,
  showBadges,
  onResolve,
  onDelegate,
  onEscalate,
}) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Prepare images for the Lightbox
  const slides = complaint.attachments.map((attachment) => ({
    src: attachment.imageUrl,
  }));

  const createdAtDisplay = moment.utc(complaint.createdAt).calendar(null, {
    sameDay: "[Today] h:mm A",
    lastDay: "[Yesterday] h:mm A",
    lastWeek: "dddd h:mm A",
    sameElse: "DD/MM/YYYY h:mm A",
  });
  return (
    <div
      className="border rounded-lg shadow-md bg-white flex flex-col"
      style={{ width: "1000px", height: "auto" }}
    >
      {/* Header */}
      {/* Profile Section */}
      {showProfile && (
        <div className="flex items-center border-b border-gray-200 p-4">
          <div className="w-12 h-12 bg-[rgb(60,79,131)] rounded-full flex items-center justify-center text-white font-bold text-lg">
            {getInitials(complaint.complainerName || "User")}
          </div>
          <div className="ml-3">
            <span className="block text-sm font-bold text-gray-700">
              @{complaint.complainerName}
            </span>
            <span className="text-xs text-gray-500">{createdAtDisplay}</span>
          </div>
        </div>
      )}

      {/* Image Carousel */}
      {complaint.attachments.length > 0 && (
        <div className="relative flex flex-col justify-center items-center mt-4">
          <Lightbox
            styles={{
              container: { backgroundColor: "rgba(255,255,255)" },
              root: {
                "--yarl__color_button": "rgb(66,66,66)",
                "--yarl__color_button_active": "rgb(158, 158, 158)",
              },
            }}
            index={lightboxIndex}
            slides={slides}
            plugins={[Inline]}
            on={{
              view: ({ index }) => setLightboxIndex(index),
              click: () => setLightboxOpen(true),
            }}
            carousel={{
              padding: 0,
              spacing: 0,
              imageFit: "cover", // Ensures the image fills the container
            }}
            inline={{
              style: {
                width: "100%",
                height: "300px",
                maxWidth: "900px",
                cursor: "pointer",
                alignItems: "center",
                justifyContent: "center",
              },
            }}
          />

          {/* Lightbox (Full-Screen View) */}
          <Lightbox
            open={lightboxOpen}
            close={() => setLightboxOpen(false)}
            index={lightboxIndex}
            slides={slides}
            on={{
              view: ({ index }) => setLightboxIndex(index),
            }}
            animation={{ fade: 0 }}
            controller={{ closeOnPullDown: true, closeOnBackdropClick: true }}
            styles={{
              container: { backgroundColor: "rgba(0,0,0,0.9)" },
              root: {
                "--yarl__color_button": "rgb(66,66,66)",
                "--yarl__color_button_active": "rgb(158, 158, 158)",
              },
            }}
          />
        </div>
      )}

      {/* Complaint Details */}
      <div className="p-4">
        <Link
          to={`/incharge/complaint/${complaint.id}`}
          className="text-lg font-semibold text-gray-800 hover:text-[rgb(60,79,131)]"
        >
          {complaint.title}
        </Link>
        <p className="text-sm text-gray-600 mt-2">
          {complaint.description.length > 200 ? (
            <>
              {complaint.description.substring(0, 200)}...{" "}
              <Link
                to={`/incharge/complaint/${complaint.id}`}
                className="text-blue-500"
              >
                read more
              </Link>
            </>
          ) : (
            complaint.description
          )}
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          {complaint.tags.map((tag, index) => (
            <Badge key={index} color="info" className="text-sm font-medium">
              {tag}
            </Badge>
          ))}
        </div>
        {showBadges && (
          <div className="flex mt-2">
            <Badge
              color={complaint.access === "PUBLIC" ? "success" : "warning"}
            >
              {complaint.access}
            </Badge>
            {complaint.postAsAnonymous && (
              <Badge color="gray" className="ml-2">
                Anonymous
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-4 border-t border-gray-200">
        <Badge
          className="text-xs font-semibold px-3 py-1 rounded-full"
          color={statusColors[complaint.status] || "gray"}
        >
          {complaint.status}
        </Badge>

        {
          <div className="flex items-center gap-2">
            <Tooltip
              content={
                complaint.status !== "DELEGATED" &&
                complaint.status !== "ASSIGNED" &&
                complaint.status !== "RECREATED"
                  ? `cannot perform action as status is ${complaint.status}`
                  : "resolve the complaint"
              }
              arrow={false}
            >
              <Button
                color="blue"
                onClick={() => onResolve?.(complaint.id)}
                disabled={
                  complaint.status !== "DELEGATED" &&
                  complaint.status !== "ASSIGNED" &&
                  complaint.status !== "RECREATED"
                }
              >
                Resolve
              </Button>
            </Tooltip>

            <Tooltip
              content={
                complaint.status !== "DELEGATED" &&
                complaint.status !== "ASSIGNED" &&
                complaint.status !== "RECREATED"
                  ? `cannot perform action as status is ${complaint.status}`
                  : "delegate to a resolver"
              }
              arrow={false}
            >
              <Button
                color="light"
                onClick={() => onDelegate?.(complaint)}
                disabled={
                  complaint.status !== "DELEGATED" &&
                  complaint.status !== "ASSIGNED" &&
                  complaint.status !== "RECREATED"
                }
              >
                Delegate
              </Button>
            </Tooltip>

            <Tooltip
              content={
                complaint.status !== "DELEGATED" &&
                complaint.status !== "ASSIGNED" &&
                complaint.status !== "RECREATED"
                  ? `cannot perform action as status is ${complaint.status}`
                  : "escalate to higher authorities"
              }
              arrow={false}
            >
              <Button
                color="purple"
                onClick={() => onEscalate?.(complaint.id)} //may change
                disabled={
                  complaint.status !== "DELEGATED" &&
                  complaint.status !== "ASSIGNED" &&
                  complaint.status !== "RECREATED"
                }
              >
                Escalate
              </Button>
            </Tooltip>
          </div>
        }
      </div>
    </div>
  );
};

export default IssueInchargeComplaintCard;
