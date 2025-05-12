"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Loader2Icon } from "lucide-react";
import toast from "react-hot-toast";
import { toggleFollow } from "@/actions/userAction";

export function FollowButton({ userID }: { userID: string }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleFollow = async () => {
    setIsLoading(true);
    try {
      await toggleFollow(userID);
    } catch (error) {
      console.log("Error in Suggested Follow Button: ", error);
      toast.error("Error Following User");
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <Button
      variant={"secondary"}
      onClick={handleFollow}
      disabled={isLoading}
      className="w-20"
    >
      {isLoading ? <Loader2Icon className="w-4 h-4 animate-spin" /> : "Follow"}
    </Button>
  );
}

export default FollowButton;
