import React, { useState, useEffect } from "react"
import { Modal, Button, Box, IconButton, useTheme } from "@mui/material"
import PropTypes from "prop-types"
import CloseIcon from "@mui/icons-material/Close"
import FormInput from "./FormInput"
import FormTextField from "./FormTextField"
import UploadField from "./UploadFile"
import axios from "axios"
import { backendURL } from "../../constants"
import GitHubRepoSearch from "./GitHubRepoSearch" // Import the new component

const ModalAddProject = ({
  open,
  onClose,
  onProjectAdded,
  onProjectEdited,
  editProject,
  githubUsername,
}) => {
  const initialFormState = {
    projectTitle: "",
    authors: "",
    description: "",
    tags: "",
    githubRepos: "",
    liveProject: "",
    imgFile: null,
  }

  const [formData, setFormData] = useState(initialFormState)
  const [collaborators, setCollaborators] = useState("")
  const [repoTags, setRepoTags] = useState("")
  const theme = useTheme()

  useEffect(() => {
    if (editProject) {
      setFormData({
        projectTitle: editProject.projectTitle,
        authors: editProject.authors,
        description: editProject.description,
        tags: editProject.tags,
        githubRepos: editProject.githubRepos,
        liveProject: editProject.liveProject,
        imgFile: editProject.imgFile,
      })
      setCollaborators(editProject.collaborators || "")
      setRepoTags(editProject.tags || "")
    } else {
      setFormData(initialFormState)
      setCollaborators("")
      setRepoTags("")
    }
  }, [editProject])

  const handleFormReset = () => {
    setFormData(initialFormState)
    setCollaborators("")
    setRepoTags("")
  }

  const handleInputChange = (e) => {
    const { id, value } = e.target
    setFormData((prevData) => ({
      ...prevData,
      [id]: value,
    }))
  }

  const handleFileChange = (e) => {
    setFormData((prevData) => ({
      ...prevData,
      imgFile: e.target.files[0],
    }))
  }

  const handleSelectRepo = async (repo) => {
    // Fetch collaborators and tags from the selected repo
    const fetchedCollaborators = await fetchRepoDetails(repo.html_url)

    setFormData({
      projectTitle: repo.name,
      authors: fetchedCollaborators || githubUsername, // Use fetched collaborators or fallback to githubUsername
      description: repo.description || "",
      tags: repo.tags || repoTags || "",
      githubRepos: repo.html_url || "",
      liveProject: repo.homepage || "",
      imgFile: null,
    })
  }

  // Co-authors are suggested from the repo's public contributors (no GitHub token needed).
  const fetchRepoDetails = async (repoUrl) => {
    try {
      const repoName = repoUrl.split("/").slice(-2).join("/")
      const response = await axios.get(
        `https://api.github.com/repos/${repoName}/contributors`,
        { params: { per_page: 20 }, headers: { Accept: "application/vnd.github+json" } }
      )
      const contributors = response.data
        .filter((c) => c.type === "User")
        .map((c) => c.login)
        .join(", ")
      setCollaborators(contributors)
      return contributors
    } catch (error) {
      console.error("Error fetching contributors:", error)
      return ""
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const userInfo = JSON.parse(localStorage.getItem("user"))
    const accessToken = userInfo.token

    const formDataToSend = new FormData()
    for (const key in formData) {
      formDataToSend.append(key, formData[key])
    }

    try {
      let response
      if (editProject) {
        response = await axios.put(
          `${backendURL}/api/projects/${editProject.id}/`,
          formDataToSend,
          {
            headers: {
              "Content-Type": "multipart/form-data",
              Authorization: `Bearer ${accessToken}`,
            },
          }
        )
      } else {
        response = await axios.post(
          `${backendURL}/api/projects/create_with_token/`,
          formDataToSend,
          {
            headers: {
              "Content-Type": "multipart/form-data",
              Authorization: `Bearer ${accessToken}`,
            },
          }
        )
      }

      if (response.status === 201 || response.status === 200) {
        handleFormReset()
        if (editProject) {
          onProjectEdited(response.data)
        } else {
          onProjectAdded(response.data)
        }
        onClose()
      } else {
        console.error("Failed to submit project:", response.statusText)
      }
    } catch (error) {
      console.error("Error submitting project:", error)
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <Box className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-dark-white border-2 border-black dark:border-dark-black shadow-24 p-4 max-w-[90%] max-h-[85%] overflow-auto">
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: "absolute",
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
        <div className="w-[1092px] max-w-full flex flex-row items-start justify-center py-10 px-5 box-border">
          <form
            className="m-0 w-[586px] shadow-[0px_1px_2px_rgba(0,_0,_0,_0.05),_0px_0px_0px_#000,_0px_0px_0px_#000] rounded-lg bg-white dark:bg-dark-white box-border border-black dark:border-dark-black flex flex-col items-start justify-start pt-[22px] pb-[25px] pr-[57px] pl-[58px] gap-[20px] max-w-full border-[1px] border-solid border-gainsboro-100 mq750:py-5 mq750:pr-7 mq750:pl-[29px] mq750:box-border"
            onSubmit={handleSubmit}
          >
            <h2 className="m-0 flex-1 relative text-5xl tracking-[-0.6px] leading-[24px] font-normal font-inter text-gray-300 dark:text-dark-gray-300 text-left inline-block max-w-full shrink-0 mq450:text-lgi mq450:leading-[19px]">
              {editProject ? "Edit Project" : "Add New Project"}
            </h2>
            <GitHubRepoSearch
              username={githubUsername} // Assuming you have the username available
              onSelectRepo={handleSelectRepo}
            />
            <FormInput
              labelVal="Project title"
              idVal="projectTitle"
              placeholderVal="Enter project title"
              value={formData.projectTitle}
              onChange={handleInputChange}
              required
            />
            <FormInput
              labelVal="Authors"
              idVal="authors"
              placeholderVal="Authors github usernames, comma separated"
              value={formData.authors}
              onChange={handleInputChange}
              required
            />
            <FormTextField
              labelVal="Short description"
              idVal="description"
              placeholderVal="Add project description"
              value={formData.description}
              onChange={handleInputChange}
              required
            />
            <FormInput
              labelVal="Tags"
              idVal="tags"
              placeholderVal="Add tags (stack, keywords, ...), comma separated"
              value={formData.tags}
              onChange={handleInputChange}
              required
            />
            <FormInput
              labelVal="GitHub Repository"
              idVal="githubRepos"
              placeholderVal="Enter a valid GitHub repo link"
              value={formData.githubRepos}
              onChange={handleInputChange}
              required
            />
            <FormInput
              labelVal="Live Project Link"
              idVal="liveProject"
              placeholderVal="Enter a valid Live demo URL"
              value={formData.liveProject}
              onChange={handleInputChange}
            />
            <UploadField
              idVal={"imgFile"}
              onChange={handleFileChange}
              required
            />
            <Button
              className="self-stretch h-10 mq450:pl-5 mq450:pr-5 mq450:box-border"
              disableElevation={true}
              variant="contained"
              type="submit"
            >
              {editProject ? "Save Changes" : "Submit Project"}
            </Button>
          </form>
        </div>
      </Box>
    </Modal>
  )
}

ModalAddProject.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onProjectAdded: PropTypes.func.isRequired,
  onProjectEdited: PropTypes.func.isRequired,
  editProject: PropTypes.object,
  githubUsername: PropTypes.string, // Added for completeness
}

export default ModalAddProject
