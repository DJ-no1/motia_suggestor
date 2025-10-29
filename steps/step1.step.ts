import {ApiRouteConfig} from "motia"


// step 1 , accepting channel name and email to start the workflow
export const config: ApiRouteConfig = {
    name: "step1",
    type: "api",
    path: "/submit",
    method: "POST",
    emits: ['yt.submit']
}

interface SubmitRequest{
    channelName: string;
    email: string;
}

export const handler = async( req: any , {emit, logger, state}:any) => {

try {
    logger.info("Received request in step1 ", {body: req.body});

    const { channelName, email } = req.body as SubmitRequest;
    if (!channelName || !email) {
        return {
            status: 404,
            body: {
                message: "email or channel Name missing"
            }
        }
    }

    // validateing stuff 

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return {
            status: 400,
            body: {
                message: "Invalid email format"
            }
        }
    }

    const jobId = `job_${Date.now()}_${Math.floor(Math.random() * 1000)}.toString()`;

    await state.set(`job_${jobId}`, {
        jobId,
        channelName,
        email,
        state: "queued",
        createdAt : new Date().toISOString()
    }) 
    logger.info(" job created and now Emitting yt.submit event for jobId: ", {jobId, channelName, email});

    await emit( {
        topic: 'yt.submit',
        data: {
            jobId,
            channelName,
            email
        }
    });
return {
    status: 200,
    body: {
        success: true,
        jobId,
        message: "your request has been queued successfully , you will recieve an email once done"
    }};

} catch (error:any) {
    logger.error("Error in step1 handler: ", {error:error.message});
    return {
        status: 500,
        body: {
            message: "Internal Server Error"
        }
    }
}
}

