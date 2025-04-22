import axios from "axios";
import {
  Alert,
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
import "react-circular-progressbar/dist/styles.css";
import { IoClose, IoInformationCircleOutline } from "react-icons/io5";
import { useNavigate } from "react-router-dom";
import { HiExclamation } from "react-icons/hi";
import Lightbox from "yet-another-react-lightbox";
import Masonry from "react-masonry-css";
import {
  customThemeSelect,
  customThemeTi,
} from "../utils/flowbiteCustomThemes";

const CreateComplaintModal = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    access: "PUBLIC",
    locationId: 0,
    attachments: [],
    tags: [],
    postAsAnonymous: false,
  });

  const [parentLocation, setParentLocation] = useState("");
  const [childLocation, setChildLocation] = useState("");
  const [block, setBlock] = useState("");
  const [locations, setLocations] = useState([]);
  const [categorizedLocations, setCategorizedLocations] = useState({});
  const [file, setFile] = useState(null);
  const [imageUploadProgress, setImageUploadProgress] = useState(null);
  const [imageUploadError, setImageUploadError] = useState(null);
  const [createError, setCreateError] = useState(null);
  const [tooltipError, setTooltipError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lightboxOpen, setLightboxOpen] = React.useState(false);
  const [lightboxIndex, setLightboxIndex] = React.useState(-1);
  const [step, setStep] = useState(1);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [loadingTags, setLoadingTags] = useState(false);
  const [tagMapping, setTagMapping] = useState([]);
  const navigate = useNavigate();
  interface Location {
    id: number;
    locationName: string;
  }

  //For Lightbox preview
  const breakpointColumnsObj = {
    default: 4,
    1100: 3,
    700: 2,
    500: 1,
  };

  useEffect(() => {
    fetchLocations();
    fetchTags();
  }, []);

  const fetchLocations = async () => {
    setLoadingLocations(true);
    try {
      const res = await fetch("/api/v1/admin/get/locations");
      const data = await res.json();
      if (data.ok) {
        setLocations(data.locations);
        categorizeLocations(data.locations);
      }
    } catch (error) {
      console.error("Error fetching locations:", error);
    } finally {
      setLoadingLocations(false);
    }
  };

  const categorizeLocations = (locations: Location[]) => {
    const categorized = {};

    locations.forEach(({ id, locationName }) => {
      const parts = locationName.split("-"); // Split into [Parent, Child, Block]

      if (parts.length === 1) {
        categorized[parts[0]] = id;
      } else if (parts.length === 2) {
        if (!categorized[parts[0]]) categorized[parts[0]] = {};
        categorized[parts[0]][parts[1]] = id;
      } else if (parts.length === 3) {
        if (!categorized[parts[0]]) categorized[parts[0]] = {};
        if (!categorized[parts[0]][parts[1]])
          categorized[parts[0]][parts[1]] = {};
        categorized[parts[0]][parts[1]][parts[2]] = id;
      }
    });

    setCategorizedLocations(categorized);
  };

  const getLocationNameById = (locationId) => {
    const location = locations.find((loc) => loc.id === locationId);
    return location ? location.locationName : "Not Selected";
  };

  const handleParentChange = (e) => {
    const selectedParent = e.target.value;
    setParentLocation(selectedParent);
    setChildLocation("");
    setBlock("");

    // If this parent has NO child or block, set locationId directly
    if (typeof categorizedLocations[selectedParent] === "number") {
      setFormData({
        ...formData,
        locationId: categorizedLocations[selectedParent],
      });
    } else {
      setFormData({ ...formData, locationId: null });
    }
  };

  const handleChildChange = (e) => {
    const selectedChild = e.target.value;
    setChildLocation(selectedChild);
    setBlock("");

    // If this child has NO block, set locationId directly
    if (
      typeof categorizedLocations[parentLocation][selectedChild] === "number"
    ) {
      setFormData({
        ...formData,
        locationId: categorizedLocations[parentLocation][selectedChild],
      });
    } else {
      setFormData({ ...formData, locationId: null });
    }
  };

  const handleBlockChange = (e) => {
    const selectedBlock = e.target.value;
    setBlock(selectedBlock);

    // Set final locationId from the selected block
    const locationId =
      categorizedLocations[parentLocation]?.[childLocation]?.[selectedBlock];
    setFormData({ ...formData, locationId });
  };

  const fetchTags = async () => {
    setLoadingTags(true);
    try {
      const res = await fetch("/api/v1/admin/get/tags");
      const data = await res.json();
      if (data.ok) {
        setTagMapping(data.tags);
        console.log(data);
      }
    } catch (error) {
      console.error("Error fetching tags:", error);
    } finally {
      setLoadingTags(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      access: "PUBLIC",
      locationId: 0,
      attachments: [],
      tags: [],
      postAsAnonymous: false,
    });
    setParentLocation("");
    setChildLocation("");
    setFile(null);
    setImageUploadProgress(null);
    setImageUploadError(null);
    setCreateError(null);
    setTooltipError(false);
  };

  const handleModalClose = () => {
    resetForm();
    onClose();
    setStep(1);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleAccessChange = () => {
    const sensitiveTags = tagMapping.filter(tag => ["Ragging", "Personal Issue"].includes(tag.tagName));
    const sensitiveTagIds = sensitiveTags.map(tag => tag.id);

    if (formData.tags.some(tag => sensitiveTagIds.includes(tag.id))) {
      setTooltipError(true);
      setTimeout(() => setTooltipError(false), 3000);
      return;
    }

    setFormData({
      ...formData,
      access: formData.access === "PRIVATE" ? "PUBLIC" : "PRIVATE",
    });
  };

  const handleTagSelection = (e) => {
    const selectedTagId = parseInt(e.target.value, 10);
    const selectedTag = tagMapping.find(tag => tag.id === selectedTagId);

    if (!formData.tags.some(tag => tag.id === selectedTagId)) {
      const updatedTags = [...formData.tags, selectedTag];
      const sensitiveTags = ["Ragging", "Personal Issue"];

      if (updatedTags.some(tag => sensitiveTags.includes(tag.tagName))) {
        setFormData({ ...formData, tags: updatedTags, access: "PRIVATE" });
      } else {
        setFormData({ ...formData, tags: updatedTags });
      }
    }
  };

  const handleUploadImage = async () => {
    try {
      if (!file || file.length === 0) {
        setImageUploadError("Please select at least one image");
        return;
      }

      const upload_preset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
      const cloud_name = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

      const uploadedUrls = [];
      for (const selectedFile of file) {
        const data = new FormData();
        data.append("file", selectedFile);
        data.append("upload_preset", upload_preset);
        data.append("cloud_name", cloud_name);

        const res = await axios.post(
          `https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`,
          data,
          {
            onUploadProgress: (progressEvent) => {
              const progress = Math.round(
                (progressEvent.loaded / progressEvent.total) * 100
              );
              setImageUploadProgress(progress);
            },
          }
        );

        const uploadedImageUrl = res.data.url;
        uploadedUrls.push(uploadedImageUrl);
      }

      setFormData({
        ...formData,
        attachments: [...formData.attachments, ...uploadedUrls],
      });
      setImageUploadProgress(null);
      setImageUploadError(null);
    } catch (error) {
      setImageUploadError("Image upload failed");
      setImageUploadProgress(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    //validations
    if (!formData.title || !formData.description || !formData.locationId) {
      setCreateError("Please fill all the fields");
    }

    if (formData.title.length < 3) {
      setCreateError("Title must be at least 3 characters long");
    }

    if (formData.description.length < 3) {
      setCreateError("Description must be at least 3 characters long");
    }

    const payload = {
      ...formData,
      tags: formData.tags.map(tag => tag.id),
    };

    try {
      setSubmitting(true);
      console.log(formData);
      const res = await fetch("/api/v1/complaint/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        console.log("Failure: ", res);
        setCreateError(data.error);
        return;
      }
      if (res.ok) {
        console.log("Success: ", res);
        setCreateError(null);
        resetForm();
        navigate("/");
        onClose();
      }
    } catch (error) {
      console.log(error);
      setCreateError("Error creating complaint. Try again later.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal show={isOpen} size="5xl" onClose={handleModalClose} popup>
      <Modal.Header />
      <Modal.Body>
        {step === 1 && (
          <div>
            <div className="space-y-6">
              <h2 className="text-2xl font-medium text-gray-900 dark:text-white">
                Facing an issue?
              </h2>
              <div>
                <div className="mb-2 block">
                  <Label htmlFor="title" value="Title" />
                </div>
                <TextInput
                  id="title"
                  placeholder="What seems to be the issue?"
                  theme={customThemeTi}
                  className="focus:border-[rgb(60,79,131)] focus:ring-[rgb(60,79,131)]"
                  required
                  onChange={handleChange}
                  color="gray"
                  value={formData.title}
                />
              </div>
              <div>
                <div className="mb-2 block">
                  <Label htmlFor="description" value="Description" />
                </div>
                <Textarea
                  id="description"
                  placeholder="Describe the issue"
                  required
                  rows={4}
                  onChange={handleChange}
                  className="focus:border-[rgb(60,79,131)] focus:ring-[rgb(60,79,131)]"
                  value={formData.description}
                />
              </div>
              <div className="flex justify-between gap-8">
                <div className="flex-1">
                  {/* Parent Dropdown */}
                  <div className="mb-4">
                    <Label htmlFor="parentLocation" value="Location Category" />
                    <Select
                      id="parentLocation"
                      value={parentLocation}
                      onChange={handleParentChange}
                      theme={customThemeSelect}
                      disabled={loadingLocations}
                    >
                      <option value="">Select Category</option>
                      {Object.keys(categorizedLocations).map((parent) => (
                        <option key={parent} value={parent}>
                          {parent}
                        </option>
                      ))}
                    </Select>
                  </div>

                  {/* Child Dropdown (Only if applicable) */}
                  {parentLocation &&
                    typeof categorizedLocations[parentLocation] ===
                      "object" && (
                      <div className="mb-4">
                        <Label
                          htmlFor="childLocation"
                          value="Specific Location"
                        />
                        <Select
                          id="childLocation"
                          value={childLocation}
                          onChange={handleChildChange}
                          theme={customThemeSelect}
                        >
                          <option value="">Select Specific Location</option>
                          {Object.keys(
                            categorizedLocations[parentLocation] || {}
                          ).map((child) => (
                            <option key={child} value={child}>
                              {child}
                            </option>
                          ))}
                        </Select>
                      </div>
                    )}

                  {/* Block Dropdown (Only if applicable) */}
                  {childLocation &&
                    typeof categorizedLocations[parentLocation][
                      childLocation
                    ] === "object" && (
                      <div>
                        <Label htmlFor="block" value="Block" />
                        <Select
                          id="block"
                          value={block}
                          onChange={handleBlockChange}
                          theme={customThemeSelect}
                        >
                          <option value="">Select Block</option>
                          {Object.keys(
                            categorizedLocations[parentLocation]?.[
                              childLocation
                            ] || {}
                          ).map((block) => (
                            <option key={block} value={block}>
                              {block}
                            </option>
                          ))}
                        </Select>
                      </div>
                    )}
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
                    disabled={loadingTags}
                  >
                    <option value="">Select a Tag</option>
                    {tagMapping.map((tag) => (
                      <option key={tag.id} value={tag.id}>
                        {tag.tagName}
                      </option>
                    ))}
                  </Select>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {formData.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded-full mr-2 mb-2"
                      >
                        {tag.tagName}
                        {/* Get tag name from the mapping */}
                        <button
                          type="button"
                          className="ml-2 text-blue-500 hover:text-blue-700"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              tags: formData.tags.filter((t) => t.id !== tag.id),
                            })
                          }
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <div className="flex gap-4 items-center justify-between border-4 border-[rgb(60,79,131)] border-dotted p-3">
                  <FileInput
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => setFile(e.target.files)}
                    className="border-gray-300 bg-gray-50 text-gray-900 focus:border-[rgb(60,79,131)] focus:ring-[rgb(60,79,131)]"
                  />
                  <Button
                    type="button"
                    className="border border-[rgb(60,79,131)] focus:ring-4 focus:ring-[rgb(60,79,131)] enabled:hover:bg-[rgb(60,79,131)]"
                    size="sm"
                    outline
                    onClick={handleUploadImage}
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
              </div>
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
            </div>
            <Button
              type="button"
              onClick={() => setStep(2)}
              className="mt-4 w-full"
              outline
              gradientDuoTone="purpleToBlue"
              disabled={imageUploadProgress || imageUploadError}
            >
              Preview Complaint
            </Button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-2xl font-medium text-gray-900 underline">
              Preview Complaint
            </h2>
            <p>
              <strong>Title:</strong> {formData.title}
            </p>
            <p>
              <strong>Description:</strong> {formData.description}
            </p>

            <p className="flex items-center gap-2">
              <strong>Location:</strong>{" "}
              {getLocationNameById(formData.locationId)}
              <Tooltip content="This cannot be edited later">
                <IoInformationCircleOutline />
              </Tooltip>
            </p>

            {/* Tags Display */}
            <div className="flex flex-wrap gap-2 mt-2">
              <p className="flex items-center gap-2">
                <strong>Tags:</strong>
              </p>
              {formData.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded"
                >
                  {tag.tagName || "Unknown"}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 mt-2">
              <p className="flex items-center gap-2">
                <strong>Access:</strong>
              </p>
              {formData.access === "PUBLIC" ? (
                <span className="bg-green-100 text-green-800 text-sm font-medium px-2.5 py-0.5 rounded">
                  Public
                </span>
              ) : (
                <span className="bg-red-100 text-red-800 text-sm font-medium px-2.5 py-0.5 rounded">
                  Private
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mt-2">
              <p className="flex items-center gap-2">
                <strong>Post As Anonymous:</strong>
              </p>
              <span className="bg-gray-100 text-gray-800 text-sm font-medium px-2.5 py-0.5 rounded">
                {formData.postAsAnonymous ? "Yes" : "No"}
              </span>
            </div>

            {/* Lightbox Photo Gallery */}
            {formData.attachments.length > 0 && (
              <div className="mt-4">
                <Masonry
                  breakpointCols={breakpointColumnsObj}
                  className="flex gap-4"
                  columnClassName="masonry-column"
                >
                  {formData.attachments.map((img, index) => (
                    <img
                      key={index}
                      src={img}
                      alt={`Image ${index + 1}`}
                      className="rounded shadow-lg cursor-pointer m-5"
                      onClick={() => {
                        setLightboxOpen(true);
                        setLightboxIndex(index);
                      }}
                    />
                  ))}
                </Masonry>
              </div>
            )}
            <Lightbox
              open={lightboxOpen}
              close={() => {
                setLightboxOpen(false);
                setLightboxIndex(-1);
              }}
              index={lightboxIndex}
              slides={formData.attachments.map((url) => ({ src: url }))}
            />

            <div className="flex justify-between mt-4">
              <Button
                onClick={() => {
                  // console.log(formData);
                  setFormData(formData);
                  setStep(1);
                }}
                outline
                gradientDuoTone="purpleToBlue"
              >
                Edit
              </Button>
              <Button
                onClick={handleSubmit}
                outline
                gradientDuoTone="purpleToBlue"
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Submit"}
              </Button>
            </div>
          </div>
        )}

        {createError && <Alert color="failure">{createError}</Alert>}
      </Modal.Body>
    </Modal>
  );
};

export default CreateComplaintModal;
