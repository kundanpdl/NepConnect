"use server";
import {prisma} from "@/lib/prisma";
import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function syncUser() {
    try{
        const { userId } = await auth();
        const user = await currentUser();
        if (!user || !userId) return;
        const existingUser = await prisma.user.findUnique({
            where: {
                clerkID: userId
            }
        })

        if (existingUser) return existingUser;
        
        const dbUser = await prisma.user.create({
            data: {
                clerkID: userId,
                name: `${user.firstName || ""} ${user.lastName || ""}`,
                username : user.username ?? user.emailAddresses[0].emailAddress.split("@")[0],
                email: user.emailAddresses[0].emailAddress,
                image: user.imageUrl
            }
        });
        return dbUser;
    }
    catch(error) {
        console.log("Error in syncUser: ", error);
    }
}

export async function getUserByClerkID(clerkId:string){
    return await prisma.user.findUnique({
        where :{
            clerkID: clerkId
        },
        include:{
            _count:{
                select:{
                    followers: true,
                    following: true,
                    posts:true
                }
            }
        }
    })
}

export async function getDbUserID(){
    const {userId:clerkId} = await auth();
    if (!clerkId) return null; 

    const user = await getUserByClerkID(clerkId);
    if (!user) throw new Error("User not found");
    return user.id;
}   

export async function getRandomUsers(){
    try {
        const userId = await getDbUserID();
        if (!userId) return [];
        const randomUsers = await prisma.user.findMany({
            where:{
                AND:[
                    {NOT: {id:userId}},
                    {NOT: {followers: {some: {followerId:userId}}}}
                ]
            },
            select:{
                id: true,
                name: true,
                username: true,
                image: true,
                _count:{
                    select:{
                        followers: true
                    }
                }
            },
            take: 5
        })
        return randomUsers;
    }
    catch(error){
        console.log("Error fetching random Users: ", error);
        return [];
    }
}

export async function toggleFollow(targetUserID:string){
    try {
        const userId = await getDbUserID();
        if (!userId) return;
        if (userId === targetUserID) throw new Error("You cannot follow yourself.");
        const existingFollow = await prisma.follows.findUnique({
            where:{
                followerId_followingId :{
                    followerId: userId,
                    followingId: targetUserID
                }
            }
        })
        if (existingFollow) {
            await prisma.follows.delete({
                where: {
                    followerId_followingId :{
                        followerId: userId,
                        followingId: targetUserID
                    }
                }
            })
        }else{
            // Concept used : Transaction : all or nothing
            await prisma.$transaction([
                prisma.follows.create({
                    data: {
                        followerId: userId,
                        followingId: targetUserID
                    }
                }),

                prisma.notification.create({
                    data: {
                        type:"FOLLOW",
                        userId: targetUserID, // The User being followed
                        creatorId: userId // Notification Creator, follower
                    }
                })
            ])
        }
        revalidatePath("/");
        return {success:true};
    }
    catch(error){
        console.log("Error in toggleFollow: ", error);
        return {success: false, message:error}
    }
}