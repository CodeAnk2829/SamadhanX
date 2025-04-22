import axios from "axios";
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  FileInput,
  Label,
  Modal,
  Select,
  Textarea,
  TextInput,
  Toast,
  Tooltip,
} from "flowbite-react";
import React, { useEffect, useState } from "react";
import { buildStyles, CircularProgressbar } from "react-circular-progressbar";
import { AiOutlineEdit } from "react-icons/ai";
import { HiExclamation } from "react-icons/hi";
import { IoClose, IoInformationCircleOutline } from "react-icons/io5";
import { useNavigate, useParams } from "react-router-dom";
import { customThemeSelect, customThemeTi } from "../utils/flowbiteCustomThemes";

interface UpdateComplaintModalProps {
  isOpen: boolean;
  onClose: () => void;
  complaintIdProp: string;
  onComplaintUpdate?: (updatedComplaint: any) => void;
}
const UpdateComplaintModal = ({
  isOpen,
  onClose,
  complaintIdProp,
  onComplaintUpdate,
}: UpdateComplaintModalProps) => {
  const [formData, setFormData] = useState<any>(null);
  const [file, setFile] = useState<any[]>([]);
  const [imageUploadProgress, setImageUploadProgress] = useState<number | null>(
    null
  );
  const [imageUploadError, setImageUploadError] = useState(null);
  const [error, setError] = useState<string | null>(null);
  const [tooltipError, setTooltipError] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [complaint, setComplaint] = useState(null);
  const id = complaintIdProp;
  const [submitting, setSubmitting] = useState(false);
  const [tagMapping, setTagMapping] = useState([]);

  const navigate = useNavigate();
  useEffect(() => {
    const fetchComplaint = async () => {
      if (!isOpen || !complaintIdProp) return;
      setLoading(true);
      try {
        const response = await fetch(`/api/v1/complaint/get/complaint/${id}`);
        const data = await response.json();
        setComplaint(data);
      } catch (err) {
        console.error("Error fetching complaint:", err);
        setError("Failed to load complaint. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    const fetchTags = async () => {
      try {
        const res = await fetch("/api/v1/admin/get/tags");
        const data = await res.json();
        if(data.ok){
          setTagMapping(data.tags);
        }
      } catch (error) {
        console.error("Error fetching tags:", error);
      }
    }

    fetchComplaint();
    fetchTags();
  }, [isOpen, complaintIdProp]);

  useEffect(() => {
    if (complaint) {
      const complaintTagIds = complaint.tags.map(tagName => {
        const tag = tagMapping.find(t => t.tagName === tagName);
        return tag ? tag.id : null;
      }).filter(id => id !== null);

      setFormData({
        complaintId: complaint.id,
        title: complaint.title,
        description: complaint.description,
        access: complaint.access,
        location: complaint.location,
        tags: complaintTagIds,
        attachments: complaint.attachments.map((attachment: any) => attachment.imageUrl),
        postAsAnonymous: complaint.postAsAnonymous,
      });
      setError(null);
    }
  }, [complaint]);
  
  
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile([...file, ...Array.from(e.target.files)]);
  };

  const handleUploadImages = async () => {
    try {
      const uploadedUrls: string[] = [];
      const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

      for (const selectedFile of file) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("upload_preset", uploadPreset);
        formData.append("cloud_name", cloudName);

        const res = await axios.post(
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
          formData,
          {
            onUploadProgress: (progressEvent) => {
              const progress = Math.round(
                (progressEvent.loaded / progressEvent.total) * 100
              );
              setImageUploadProgress(progress);
            },
          }
        );

        uploadedUrls.push(res.data.url);
      }

      setFormData({
        ...formData,
        attachments: [...formData.attachments, ...uploadedUrls],
      });
      setFile([]);
      setImageUploadProgress(null);
    } catch (error) {
      console.error("Error uploading images:", error);
      setError("Failed to upload images. Please try again.");
    }
  };

  const handleTagSelection = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedTagId = parseInt(e.target.value, 10);
    const selectedTag = tagMapping.find(tag => tag.id === selectedTagId);
    const sensitiveTags = ["Ragging", "Personal Issue"];

    if (!formData.tags.includes(selectedTagId)) {
      const updatedTags = [...formData.tags, selectedTagId];
      const isSensitive = sensitiveTags.includes(selectedTag.tagName);

      if (isSensitive) {
        setFormData({ ...formData, tags: updatedTags, access: "PRIVATE" });
        setTooltipError(true);
        setTimeout(() => setTooltipError(false), 3000);
      } else {
        setFormData({ ...formData, tags: updatedTags });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSend = {
      title: formData.title,
      description: formData.description,
      access: formData.access,
      postAsAnonymous: formData.postAsAnonymous,
      tags: formData.tags,
      attachments: formData.attachments,
    };
    try {
      setSubmitting(true);
      const res = await fetch(`/api/v1/complaint/update/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dataToSend),
      });
      const data = res.json();
      if (!res.ok) {
        setCreateError(data.error);
        return;
      }
      if (res.ok) {
        setCreateError(null);
        onClose();
        navigate(`/complaint/${formData.complaintId}`);
      }
    } catch (error) {
      console.log(error);
      setCreateError("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAccessChange = () => {
    const sensitiveTags = ["Ragging", "Personal Issue"];
    const hasSensitiveTag = formData.tags.some(tagId => {
      const tag = tagMapping.find(t => t.id === tagId);
      return tag && sensitiveTags.includes(tag.tagName);
    });

    if (hasSensitiveTag) {
      setTooltipError(true);
      setTimeout(() => setTooltipError(false), 3000);
      return;
    }

    setFormData({
      ...formData,
      access: formData.access === "PRIVATE" ? "PUBLIC" : "PRIVATE",
    });
  };
  const resetForm = () => {
    setFormData({
      complaintId: complaint.complaintId,
      title: complaint.title,
      description: complaint.description,
      access: complaint.access,
      location: complaint.location,
      tags: complaint.tags.map(tag => tag.id),
      attachments: complaint.attachments.map(
        (attachment: any) => attachment.imageUrl
      ),
      postAsAnonymous: complaint.postAsAnonymous,
    });
    const [parent, child, block] = complaint.location.split("-");
    setError(null);
  };

  const handleModalClose = () => {
    resetForm();
    setFormData(null);
    setError(null);
    setFile([]);
    setImageUploadProgress(null);
    setImageUploadError(null);
    onClose();
  };
  if (!isOpen || loading) return null;

  if (!complaint || !formData) {
    return (
      <Modal show={isOpen} onClose={handleModalClose}>
        <Modal.Header>Error</Modal.Header>
        <Modal.Body>
          <Alert color="failure">
            Failed to load complaint data. Please try again.
          </Alert>
        </Modal.Body>
      </Modal>
    );
  }
  
  return (
    <div>
      <Modal show={isOpen} size="5xl" onClose={handleModalClose} popup>
        <Modal.Header>Update Complaint</Modal.Header>
        <Modal.Body>
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              <div>
                <div className="mb-2 block">
                  <Label htmlFor="title" value="Title" />
                </div>
                <TextInput
                  id="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  theme={customThemeTi}
                  className="focus:border-[rgb(60,79,131)] focus:ring-[rgb(60,79,131)]"
                />
              </div>
              <div>
                <div className="mb-2 block">
                  <Label htmlFor="description" value="Description" />
                </div>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  className="focus:border-[rgb(60,79,131)] focus:ring-[rgb(60,79,131)]"
                  rows={4}
                />
              </div>
              <div className="mb-2 float-left">
                <Label htmlFor="location" value="Location:" />
              </div>
              <div className="flex justify-between gap-8">
                <div className="flex mt-1 ml-2">
                  <Badge color="gray" className="float-right">
                    {complaint.location}
                  </Badge>{" "}
                </div>

                {/* Right Side - Tags */}
                <div className="flex-1">
                  <Label htmlFor="tags" value="Tags" />
                  <Select
                    id="tags"
                    value=""
                    onChange={handleTagSelection}
                    theme={customThemeSelect}
                    color="gray"
                  >
                    <option value="">Select a Tag</option>
                    {tagMapping.map((tag) => (
                      <option key={tag.id} value={tag.id}>
                        {tag.tagName}
                      </option>
                    ))}
                  </Select>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.tags && formData.tags.map((tagId) => (
                      <span
                        key={tagId}
                        className="inline-flex items-center bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded-full mr-2 mb-2"
                      >
                        {tagMapping.find((tag) => tag.id === tagId)?.tagName}
                        <button
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              tags: formData.tags.filter(
                                (id) => id !== tagId
                              ),
                            })
                          }
                          className="ml-2 text-blue-500 hover:text-blue-700"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-4 items-center justify-between border-4 border-[rgb(60,79,131)] border-dotted p-3">
                <FileInput
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="border-gray-300 bg-gray-50 text-gray-900 focus:border-[rgb(60,79,131)] focus:ring-[rgb(60,79,131)]"
                />
                <Button
                  onClick={handleUploadImages}
                  className="border border-[rgb(60,79,131)] focus:ring-4 focus:ring-[rgb(60,79,131)] enabled:hover:bg-[rgb(60,79,131)]"
                  size="sm"
                  outline
                  disabled={imageUploadProgress}
                >
                  {imageUploadProgress ? (
                    <div className="w-16 h-16">
                      <CircularProgressbar
                        value={imageUploadProgress}
                        text={`${imageUploadProgress || 0}%`}
                        className="text-[rgb(60,79,131)] "
                        styles={buildStyles({
                          pathColor: "#3C4F83",
                        })}
                      />
                    </div>
                  ) : (
                    "Upload Image"
                  )}
                </Button>
              </div>
              {imageUploadError && (
                <Alert color="failure">{imageUploadError}</Alert>
              )}
              {formData.attachments.length > 0 && (
                <div className="flex flex-wrap gap-4 mt-4">
                  {formData.attachments.map((attachment, index) => (
                    <div key={index} className="relative">
                      <img
                        src={attachment}
                        alt={`Uploaded ${index + 1}`}
                        className="w-32 h-32 object-cover rounded"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            attachments: formData.attachments.filter(
                              (_, i) => i !== index
                            ),
                          })
                        }
                        className="absolute top-1 right-1 bg-gray-200 text-slate-600 p-1 rounded-full"
                      >
                        <IoClose />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="access"
                    className="text-2xl text-[rgb(60,79,131)] focus:ring-[rgb(60,79,131)]"
                    checked={formData.access === "PUBLIC"}
                    onChange={handleAccessChange}
                  />
                  <Label htmlFor="access" className="text-sm">
                    Post Publicly
                  </Label>
                  {tooltipError && (
                    <Toast>
                      <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-500 dark:bg-orange-700 dark:text-orange-200">
                        <HiExclamation className="h-5 w-5" />
                      </div>
                      <div className="ml-3 text-sm font-normal">
                        Complaints with tags "Ragging" and "Personal Issues"
                        cannot be posted publicly
                      </div>
                      <Toast.Toggle />
                    </Toast>
                  )}
                  <Tooltip
                    content="Public complaints are visible to all users"
                    arrow={false}
                    placement="right"
                    animation="duration-500"
                    className="bg-[rgb(224,224,244)] text-slate-800"
                  >
                    <IoInformationCircleOutline />
                  </Tooltip>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <Checkbox
                  id="anonymous"
                  checked={formData.postAsAnonymous}
                  onChange={() =>
                    setFormData({
                      ...formData,
                      postAsAnonymous: !formData.postAsAnonymous,
                    })
                  }
                  className="text-2xl text-[rgb(60,79,131)] focus:ring-[rgb(60,79,131)]"
                />
                <Label htmlFor="anonymous">Submit Anonymously</Label>
                <Tooltip
                  content="Your username will be hidden from other users"
                  arrow={false}
                  placement="right"
                  animation="duration-500"
                  className="bg-[rgb(224,224,244)] text-slate-800"
                >
                  <IoInformationCircleOutline />
                </Tooltip>
              </div>
              <Button
                type="submit"
                className="w-full mt-4 border border-transparent bg-[rgb(60,79,131)] text-white focus:ring-4 focus:ring-purple-300 enabled:hover:bg-[rgb(47,69,131)] dark:bg-purple-600 dark:focus:ring-purple-900 dark:enabled:hover:bg-purple-700"
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Save Changes"}
              </Button>
            </div>
          </form>
          {error && <Alert color="failure">{error}</Alert>}
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default UpdateComplaintModal;
