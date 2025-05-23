import { useEffect, useState } from "react";
import AdminSidebar from "../components/AdminSidebar";
import DashboardCharts from "../components/DashboardCharts";
import StatCard from "../components/StatCard";
import { Badge, Card, Select } from "flowbite-react";
import { customThemeSelect } from "../utils/flowbiteCustomThemes";
import Lightbox from "yet-another-react-lightbox";
import Inline from "yet-another-react-lightbox/plugins/inline";
import "yet-another-react-lightbox/styles.css";

const AdminDashboard = () => {
  const [summary, setSummary] = useState({
    last7Days: { created: 20, resolved: 12 },
    last30Days: { created: 50, resolved: 40 },
    last90Days: { created: 120, resolved: 100 },
  });

  const [trends, setTrends] = useState([
    { range: "7d", created: 20, resolved: 12 },
    { range: "30d", created: 50, resolved: 40 },
    { range: "90d", created: 120, resolved: 100 },
  ]);

  const [filters, setFilters] = useState({
    dateRange: "7d",
    tag: "",
    location: "",
    status: "",
  });

  const [complaints, setComplaints] = useState([
    {
      id: "1",
      title: "Water leakage in Hostel A",
      description:
        "There is a persistent water leak in the bathroom of room 101.",
      tag: "Hostel",
      location: "Hostel A",
      status: "pending",
      attachments: [
        {
          imageUrl:
            "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQUPIfiGgUML8G3ZqsNLHfaCnZK3I5g4tJabQ&s",
        },
        {
          imageUrl:
            "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQUPIfiGgUML8G3ZqsNLHfaCnZK3I5g4tJabQ&s",
        },
      ],
    },
    {
      id: "2",
      title: "Wi-Fi not working in Library",
      description:
        "Internet connection has been down for 2 days in the reading section.",
      tag: "Internet",
      location: "Library",
      status: "resolved",
      attachments: [
        {
          imageUrl:
            "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQUPIfiGgUML8G3ZqsNLHfaCnZK3I5g4tJabQ&s",
        },
      ],
    },
    {
      id: "3",
      title: "Unhygienic food in Mess",
      description: "Found insects in lunch served yesterday.",
      tag: "Mess",
      location: "Mess",
      status: "pending",
      attachments: [
        {
          imageUrl:
            "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQUPIfiGgUML8G3ZqsNLHfaCnZK3I5g4tJabQ&s",
        },
        { imageUrl: "https://via.placeholder.com/300x150?text=Food+2" },
      ],
    },
  ]);

  const filteredComplaints = complaints.filter((complaint) => {
    return (
      (filters.tag ? complaint.tag === filters.tag : true) &&
      (filters.location ? complaint.location === filters.location : true) &&
      (filters.status ? complaint.status === filters.status : true)
    );
  });

  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  return (
    <div className="flex flex-col md:flex-row">
      {/* Sidebar */}
      <div className="w-full md:w-1/4">
        <AdminSidebar />
      </div>

      {/* Main Dashboard */}
      <div className="w-full md:w-3/4 px-6 py-6 bg-gray-50 min-h-screen">
        <h1 className="text-2xl font-bold mb-6">Admin Dashboard Analytics</h1>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <StatCard
            title="Complaints in Last 7 Days"
            value={summary.last7Days.created}
          />
          <StatCard
            title="Resolved Complaints"
            value={summary.last7Days.resolved}
          />
          <StatCard
            title="Total in 30 Days"
            value={summary.last30Days.created}
          />
          {/* <StatCard title="Add Charts" value="+" icon={<HiChartBar />} /> */}
        </div>

        {/* Charts */}
        <DashboardCharts trends={trends} summary={summary} />

        {/* Complaint Cards */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Complaints</h2>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <Select
              className="px-3 py-2"
              value={filters.dateRange}
              onChange={(e) =>
                setFilters({ ...filters, dateRange: e.target.value })
              }
              theme={customThemeSelect}
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </Select>

            <Select
              className="px-3 py-2"
              value={filters.tag}
              onChange={(e) => setFilters({ ...filters, tag: e.target.value })}
              theme={customThemeSelect}
            >
              <option value="">Filter by Tag</option>
              <option value="Hostel">Hostel</option>
              <option value="Mess">Mess</option>
              <option value="Internet">Internet</option>
            </Select>

            <Select
              className="px-3 py-2"
              value={filters.location}
              onChange={(e) =>
                setFilters({ ...filters, location: e.target.value })
              }
              theme={customThemeSelect}
            >
              <option value="">Filter by Location</option>
              <option value="Hostel A">Hostel A</option>
              <option value="Library">Library</option>
              <option value="Mess">Mess</option>
            </Select>

            <Select
              className="px-3 py-2"
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value })
              }
              theme={customThemeSelect}
            >
              <option value="">Filter by Status</option>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </Select>
          </div>

          {/* Complaint Cards */}
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Complaints</h2>
            {filteredComplaints.length === 0 ? (
              <p className="text-gray-500">
                No complaints match the selected filters.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredComplaints.map((complaint, index) => (
                  <div
                    key={complaint.id}
                    className="bg-white rounded shadow p-4"
                  >
                    <div className="mb-2">
                      <Lightbox
                        styles={{
                          container: { backgroundColor: "rgba(255,255,255)" },
                        }}
                        index={lightboxIndex}
                        open={lightboxOpen && lightboxIndex === index}
                        close={() => setLightboxOpen(false)}
                        slides={complaint.attachments.map((img) => ({
                          src: img.imageUrl,
                        }))}
                        plugins={[Inline]}
                        on={{
                          view: ({ index }) => setLightboxIndex(index),
                          click: () => setLightboxOpen(true),
                        }}
                        inline={{
                          style: {
                            width: "100%",
                            height: "200px",
                            cursor: "pointer",
                            justifyContent: "center",
                          },
                        }}
                      />
                    </div>
                    <h5 className="text-lg font-bold tracking-tight text-gray-900">
                      {complaint.title}
                    </h5>
                    <p className="font-normal text-gray-700">
                      {complaint.description}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge color="info">{complaint.tag}</Badge>
                      <Badge color="warning">{complaint.location}</Badge>
                      <Badge
                        color={
                          complaint.status === "resolved"
                            ? "success"
                            : complaint.status === "pending"
                              ? "warning"
                              : "gray"
                        }
                      >
                        {complaint.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
