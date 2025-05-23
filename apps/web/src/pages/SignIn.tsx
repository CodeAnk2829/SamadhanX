import {
  Alert,
  Button,
  Label,
  Select,
  Spinner,
  TextInput,
} from "flowbite-react";
import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { signInFailure, signInStart, signInSuccess } from "../redux/user/userSlice";
import { customThemeSelect, customThemeTi } from "../utils/flowbiteCustomThemes";

function SignIn() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    role: "STUDENT", // Default role
  });
  const { loading, error: errorMessage } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const handleChange = (e: any) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      return dispatch(signInFailure('Please fill all the fields'));
    }  

    try {
      dispatch(signInStart());
      const res = await fetch("/api/v1/user/auth/signin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      console.log(data);
      localStorage.setItem("token", data.token);

      if (data.ok === false) {
        if (data.error && data.error.includes("prisma.user.findUnique")) {
          return dispatch(signInFailure("Unauthorized: You cannot log in as this role"));
        }
        
        return dispatch(signInFailure(data.error || "Sign-in failed"));
      }
      if (res.ok) {
        dispatch(signInSuccess(data));
        navigate("/role-redirect");
      }
    } catch (error: any) {
      dispatch(signInFailure(error.message));
    }
  };

  return (
    <div className="flex flex-col min-h-screen md:flex-row">
      <div className="hidden md:flex md:w-1/2 lg:w-2/5 bg-[rgb(222,224,244)] flex-col items-center justify-center p-8">
        <img
          src="/manit_logo.png"
          alt="NIT Bhopal Logo"
          className="w-1/3 mb-4"
        />
        <h1 className="text-2xl font-bold text-center text-[rgba(60,79,131,1)]">
          MAULANA AZAD
        </h1>
        <h2 className="text-xl font-bold text-center text-[rgba(60,79,131,1)]">
          NATIONAL INSTITUTE OF TECHNOLOGY
        </h2>
        <h3 className="text-lg font-bold text-center text-[rgba(60,79,131,1)]">
          BHOPAL
        </h3>
      </div>

      <div className="flex w-full md:w-1/2 lg:w-3/5 flex-col items-center justify-center">
        <div className="flex md:hidden flex-col items-center mb-6 w-screen bg-[rgb(222,224,244)] mt-0 p-4">
          <img
            src="/public/manit_logo.png"
            alt="NIT Bhopal Logo"
            className="w-24 mb-4"
          />
          <h1 className="text-xl font-bold text-center text-[rgba(60,79,131,1)]">
            MAULANA AZAD
          </h1>
          <h2 className="text-lg font-bold text-center text-[rgba(60,79,131,1)]">
            NATIONAL INSTITUTE OF TECHNOLOGY
          </h2>
          <h3 className="text-base font-bold text-center text-[rgba(60,79,131,1)]">
            BHOPAL
          </h3>
        </div>

        <div className="w-full max-w-md p-6 bg-white border rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-center mb-6 text-[rgba(60,79,131,1)]">
            Sign In
          </h2>
          <form onSubmit={handleSubmit}>
            {/* Username Field */}
            <div className="mb-4">
              <Label htmlFor="email" value="Email" />
              <TextInput
                id="email"
                type="text"
                placeholder="abc@manit.ac.in"
                required
                className="mt-1  text-gray-900 text-sm rounded-lg"
                onChange={handleChange}
                theme={customThemeTi}
              />
            </div>

            {/* Password Field */}
            <div className="mb-4">
              <Label htmlFor="password" value="Password" />
              <TextInput
                id="password"
                type="password"
                placeholder="******"
                className="mt-1  text-gray-900 text-sm rounded-lg"
                onChange={handleChange}
                theme={customThemeTi}
              />
            </div>

            <div>
              <Label htmlFor="role" value="Role" />
              <Select
                id="role"
                className="mt-1  text-gray-900 text-sm rounded-lg"
                onChange={handleChange}
                value={formData.role}
                theme={customThemeSelect}
              >
                <option value="STUDENT">Student </option>
                <option value="FACULTY">Faculty </option>
                <option value="ISSUE_INCHARGE">Issue Incharge</option>
                <option value="ADMIN">Admin</option>
              </Select>
            </div>

            {/* Remember Me and Forgot Password */}
            <div className="flex items-center justify-between mb-4 mt-4">
              {/* Remember Me Section */}
              {/* <div className="flex items-center">
                    <Checkbox id="remember" />
                    <Label htmlFor="remember" className="ml-2">
                      Remember me
                    </Label>
                  </div> */}

              {/* Forgot Password Link */}
              <a
                href="/forgot-password"
                className="text-sm text-blue-500 hover:underline"
              >
                Forgot Password?
              </a>
            </div>

            {/* Login Button */}
            <Button
              type="submit"
              className="w-full mb-2 bg-[rgba(60,79,131,1)] enabled:hover:bg-[rgba(16,76,144,0.9)]"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Spinner size="sm" />
                  <span className="pl-3">Loading...</span>
                </>
              ) : (
                "Sign In"
              )}
            </Button>

            {/* Sign Up Link */}
            <p className="text-center text-sm mt-4">
              {" "}
              <span>Don't have an account? </span>
              <Link to="/sign-up" className="text-blue-500">
                Sign Up
              </Link>
            </p>
          </form>
          {errorMessage && (
            <Alert className="mt-5" color="failure">
              {errorMessage}
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
}

export default SignIn;
