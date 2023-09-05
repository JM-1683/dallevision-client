//The main portion of the UI: all content is processed here.

import React, { useState, useRef, useEffect } from 'react';
import Cookies from 'js-cookie';
import './page.css';

//The server sends the story content formatted with '\n' as line breaks.
//This function formats the story with <br />'s in place of newlines.
const TextWithBreaks = ({ text }) => {
    const newText = text.split('\n').map((str, index, array) =>
        index === array.length - 1 ? str :
            <>
                {str}
                <br />
            </>
    );
    return <>{newText}</>;
}

//The main Canvas component.
const Canvas = () => {
    const canvasRef = useRef(null); //access DOM directly
    const [currentImage, setCurrentImage] = useState('');
    const [previousImage, setPreviousImage] = useState('');
    const [loading, setLoading] = useState(false);
    const [terms, setTerms] = useState('');
    const [story, setStory] = useState('');
    const [pictureID, setPictureID] = useState('');
    const [toggle, setToggle] = useState(true);
    const [caption, setCaption] = useState('');
    const [voteStatus, setVoteStatus] = useState(false);
    const [voteCaption, setVoteCaption] = useState('');

    //This allows the toggle button to switch the content in the textbox between
    //the image's story and the prompt used to generate the image.
    const toggleButton = () => {
        if (toggle === false) {
            setCaption(story);
            setToggle(true);
        } else {
            setCaption(terms);
            setToggle(false);
        }
    }

    //Draws the image on the canvas. Takes a Base64 encoded image and draws it.
    const drawImageOnCanvas = async (base64Image) => {
        try {
            const img = new Image();
            img.onload = () => { //this executes once the image loads entirely
                if (canvasRef.current) { //Checks if canvasRef.current has been attached to a DOM element, presumably an HTML <canvas>
                    const context = canvasRef.current.getContext('2d');
                    context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height); // Clear previous image
                    context.drawImage(img, 0, 0); // Draw new image
                }
            };
            img.src = `data:image/png;base64,${base64Image}`; // Assuming it's a PNG. Adjust if necessary.
        } catch (err) {
            console.log(err);
        }
    };

    //This hits the API endpoint that sends the story content.
    const fetchAndSetImage = async () => {
        try {
            const response = await fetch('http://localhost:3000/getImage');
            if (response.ok) {
                const pictureData = await response.json(); //get PictureData
                setPreviousImage(currentImage); //previousImage and currentImage will be used for user functionality, image transition animations, etc
                setCurrentImage(pictureData.image);
                setTerms(pictureData.imageTerms); //sets the prompt used for the image's generations
                setStory(pictureData.story); //sets the story associated with the image
                setPictureID(pictureData.ID); //sets the ID associated with the image
                setCaption(pictureData.story);
                setVoteCaption('');
                setLoading(true); //Sets the loading state to true

            } else {
                console.log(`Failed to fetch the image: ${response.statusText}`);
            }
        } catch (error) {
            console.log(error);
        }
    };

    const upVote = async (ID) => {
        try {
            console.log(ID);
            
            // ID 00000 is the image that loads if there's no existing story generation for a given day. No
            // reason to allow votes on it. It's just an hourglass
            if (ID === '00000') {
                setVoteCaption("You can't vote on this image.");
                return;
            }
    
            // Cookies are used to track votes. At some point, a User auth system will be put in place,
            // which can better track votes.
            const hasVoted = Boolean(Cookies.get(`voted_for_${ID}`));
            if (hasVoted) {
                setVoteCaption("You've already voted on this image.");
                return; // Exit early if the user has already voted
            }
            
            console.log(`Attempting vote on ${ID}`);
            
            // Endpoint named 'vote' and not 'upvote' as this will include also downvotes in the future
            const response = await fetch('http://localhost:3000/vote', {
                method: 'POST',
                mode: 'cors',
                cache: 'no-cache',
                headers: {
                    'Content-Type': 'application/json'
                },
                redirect: 'follow',
                referrerPolicy: 'no-referrer',
                body: JSON.stringify({ ID })
            });
            
            const result = await response.json();
            console.log(result);
    
            // If there's a positive response w/ data from the upvote endpoint, then the vote caption will be sent from the server
            // and displayed under the vote button
            if (result.success) {
                setVoteCaption(result.message);
                Cookies.set(`voted_for_${pictureID}`, true, { expires: 7, sameSite: 'strict' }); // Set cookie for 7 days
            } else {
                setVoteCaption(result.message); // e.g. "You've already voted for this picture"
            }
        } catch (err) {
            console.log(err);
        }
    }
    
    //This fetches/sets a story on component load, and sets the interval (in ms) of 30 seconds for each story load
    useEffect(() => {
        fetchAndSetImage();
        const intervalSet = setInterval(() => {
            fetchAndSetImage();
        }, 30000);
        return () => {
            clearInterval(intervalSet);
        }
    }, []);

    //checks if there's a cookie indicating the user has already voted on the image with the current pictureID. 
    //If such a cookie exists, it sets the voteStatus state to true, indicating a vote has been made, and false otherwise. 
    useEffect(() => {
        const hasVoted = Cookies.get(`voted_for_${pictureID}`);
        setVoteStatus(Boolean(hasVoted));
    }, [pictureID]);

    //Will load the image on the canvas if loading = TRUE, then sets loading status to false
    useEffect(() => {
        if (loading) {
            // Reset loading after animation duration
            setTimeout(() => {
                drawImageOnCanvas(currentImage);
                setLoading(false);
            }, 1000);
        }
    }, [loading]);

    //Then the canvas, storybox, + buttons are finally returned.
    return (
        <React.Fragment>
            <div className='contentContainer'>
                <canvas className={`canvas ${loading ? 'fading' : ''}`} ref={canvasRef} width={512} height={512} />
                <div className='infoContainer'>
                    <p><TextWithBreaks text={caption} /></p>
                    <button className='button-toggle' onClick={toggleButton}>Toggle Info</button>
                    <button className='button-toggle' onClick={() => upVote(pictureID)} >Upvote Picture</button>
                    <div className='status'>{voteCaption}</div>
                </div>
            </div>
        </React.Fragment>
    );
}

export default Canvas;
