import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import uploadToBlob from "../../azureUpload.jsx";
const secretKey = import.meta.env.VITE_MY_KEY_FOR_AI;
const samplePrompts = [
  "You are a professional graphic designer. Create the marketing graphics for the following request. Be very professional and do not display text unless specifically asked =>",
  "Design an image showcasing email campaign analytics. Use a sleek and modern style with green and white accents.",
  "Create an image of a modern business dashboard for a marketing CRM with no text above the image. The dashboard should display key performance indicators such as sales growth, customer acquisition, and conversion rates. Use a clean and professional design with a blue and white color scheme.",
  "Generate a professional marketing image for a Sales CRM targeting medium enterprises in finance, featuring a light blue to white background, green and orange accents, dark gray text, a modern office photo with CRM icons and interface screenshots highlighting workflows and lead management, incorporating a sales performance chart, centered company logo with Roboto font.",
];

const ImageEditor = () => {
  const [base64Data, setBase64Data] = useState('');
  const [selectedPrompt, setSelectedPrompt] = useState(samplePrompts[0]);
  const [additionalSpecifications, setAdditionalSpecifications] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const iframeRef = useRef(null);
  
  const [inpaintingText, setInpaintingText] = useState('Make a car');
  const [aspectRatio, setAspectRatio] = useState('instagram'); //
  const [savedscript,setSavedScript]=useState('');
  const [serverUrl, setServerUrl] = useState('http://localhost:3000/edit-imagesss');
  const [ImageBuffer,setImageBuffer]=useState('');
  const [ImageBuffer2,setImageBuffer2]=useState('');
  const runCustomScript = () => {
    const { current: iframe } = iframeRef;
  
    if (iframe) {
      // Example: Run the first script to open an image
      const openImageScript = 'app.open("https://www.photopea.com/api/img2/pug.png", null, true);';
      iframe.contentWindow.postMessage(openImageScript, '*');
  
      // Wait 2 seconds (2000 ms) and then run the second script
      setTimeout(() => {
        const secondScript = 'app.activeDocument.resizeImage(1080,1600);';
        iframe.contentWindow.postMessage(secondScript, '*');
      }, 2000);
    }
  };
  const handleIframeLoad = () => {
    const { current: iframe } = iframeRef;

    if (iframe) {
      // Example: Listen to messages from Photopea
      window.addEventListener('message', (e) => {
        console.log('Message received from Photopea:', e.data);
        // Handle messages as needed
      });

      // Example: Send initial script after iframe is loaded (optional)
      // const initialScript = 'app.echoToOE("Hello from React!");';
      // iframe.contentWindow.postMessage(initialScript, '*');
    }
  };

  useEffect(() => {
    const handleMessage = (event) => {
      // Handle messages received from Photopea
      console.log('Message from Photopea:', event.data);
      // Example: Check if message is "done"
      
  if (event.data === 'ComingStage') {
    // Update ImageBuffer2 when 'ComingStage' message is received
    setImageBuffer2(ImageBuffer);
  } else if (event.data instanceof ArrayBuffer) {
    // Update ImageBuffer when ArrayBuffer is received
    setImageBuffer(event.data);
  }
  
      if (event.data === 'done') {
        
        // Photopea has finished processing
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);   
  const handleUploadToAzure = async (base64Data) => {
    try {
      console.log("Starting upload to Azure...");
      const blob = await fetch(base64Data).then(res => res.blob());
      console.log("Blob created:", blob);

      const uploadedUrl = await uploadToBlob(new File([blob], `${uuidv4()}.png`, { type: blob.type }), 'll');
      console.log('Image uploaded to Azure:', uploadedUrl);

      if (!uploadedUrl) {
        throw new Error("Upload to Azure failed.");
      }
      
      return uploadedUrl;
    } catch (error) {
      console.error('Error uploading image to Azure:', error);
      throw error;
    }
  };

  const handleGenerateImage = async () => {
    setLoading(true);
    setError(null);
    try {
      const fullPrompt = `${selectedPrompt}. ${additionalSpecifications}`;
      const response = await axios.post(
        "https://api.openai.com/v1/images/generations",
        {
          prompt: fullPrompt,
          n: 1,
          response_format: 'b64_json',
          model: "dall-e-3"
        },
        {
          headers: {
            Authorization: `Bearer ${secretKey}`,
          },
        }
      );

      const base64Data = response.data.data[0].b64_json;
      const formattedBase64Data = `data:image/png;base64,${base64Data}`;
      console.log("Generated Base64 Data:", formattedBase64Data);

      setBase64Data(formattedBase64Data);
      const uploadedUrl = await handleUploadToAzure(formattedBase64Data);
      console.log("Upload complete, URL:", uploadedUrl);
    } catch (error) {
      setError("Error generating image. Please try again.");
      console.error("Error generating image:", error);
    }
    setLoading(false);
  };
  const arrayBufferToBase64 = async(buffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };
  const sendImageBuffer = async (base64String) => {
    if (base64String) {
      try {
        console.log("This is an image buffer in base64", base64String);
  
        const response = await axios.post('http://localhost:3000/edit-imagesss', {
          imageData: base64String,
        }, {
          headers: {
            'Content-Type': 'application/json',
          }
        });
  
        const result = response.data;
        return result.url;
      } catch (error) {
        console.error('Error sending image buffer:', error);
      }
    }
  };
  
  const config =  {
      files: [base64Data],
      resources: [],
      server: {
        version: 1,
        url: serverUrl, // Use the current serverUrl state
        formats: ["png"]
      },
      script: savedscript// Assuming savedscript is defined somewhere
    }
  

// Use config for further operations
console.log('Config:', config);

  const encodedConfig = config ? encodeURIComponent(JSON.stringify(config)) : null;
  const photopeaUrl = encodedConfig ? `https://www.photopea.com#${encodedConfig}` : null;

  useEffect(() => {
    console.log("photopeaUrl updated:", photopeaUrl);
  }, [photopeaUrl]);

  useEffect(() => {
    console.log("base64Data updated:", base64Data);
  }, [base64Data]);
  const handleInpainting1 = () => {
    const { current: iframe } = iframeRef;
  
    if (iframe) {
      // Example: Run the first script to open an image
      const openGetImage1 = ' var doc = app.activeDocument;var newLayer = doc.activeLayer.duplicate();doc.layers[0].visible = false;alert("Lets choose the erase and erase the portion where we want generation");'
      iframe.contentWindow.postMessage(openGetImage1, '*');
     // Wait 2 seconds (2000 ms) and then run the second script
    }
  };
  const handleInpainting = async() => {
    const { current: iframe } = iframeRef;
  
    if (iframe) {
      // Example: Run the first script to open an image
      const openGetImage1 = 'app.activeDocument.saveToOE("png");'
      iframe.contentWindow.postMessage(openGetImage1, '*');
      const openGetImage2 = 'app.echoToOE("ComingStage")';
      iframe.contentWindow.postMessage(openGetImage2, '*');
        const openGetImage3 = 'app.activeDocument.layers[0].visible = true;app.activeDocument.saveToOE("png");';
        iframe.contentWindow.postMessage(openGetImage3, '*');
      
     // Wait 2 seconds (2000 ms) and then run the second script
    }
 
    
 
  };

const postToEditImages = async (base64Data1, base64Data2, prompt) => {
  try {
    // Construct the request body
    const requestBody = {
      base64Data1,
      base64Data2,
      prompt,
    };

    // Replace 'http://your-backend-url/edit-images' with your actual backend URL
    const apiUrl = 'http://localhost:3000/edit-images';

    // Make POST request using axios
    const response = await axios.post(apiUrl, requestBody);

    // Log or process the response from the server
    console.log('Response from server:', response.data);

    return response.data; // Return the edited image URL or any other data
  } catch (error) {
    console.error('Error making POST request:', error);
    throw error; // Handle or rethrow the error as needed
  }
};
  const handleDatatobase64 = async () => {
    if (ImageBuffer && ImageBuffer2) {
      try {
        // Convert both ArrayBuffer to base64 concurrently
        const [base64Image1, base64Image2] = await Promise.all([
          arrayBufferToBase64(ImageBuffer),
          arrayBufferToBase64(ImageBuffer2),
        ]);
  
        // Log the base64 strings
      console.log('Base64 Image 1:', base64Image1);
       console.log('Base64 Image 2:', base64Image2);
  
        // Call the function to post data to edit images
        //const editedImageUrl = await postToEditImages(base64Image1, base64Image2, inpaintingText);
        //console.log('Edited Image URL:', editedImageUrl);
  
        // Proceed with any further processing using base64Image1 and base64Image2
      } catch (error) {
        console.error('Error converting ArrayBuffer to base64 or making POST request:', error);
      }
    } else {
      console.log("ImageBuffer or ImageBuffer2 is missing");
    }
  };
  
  const handleAspectRatioChange = (e) => {
    // Set the selected aspect ratio
    setAspectRatio(e.target.value);
  };
  const handleRaarrrr =async() => {
    const { current: iframe } = iframeRef;
  
    if (iframe) {
      // Example: Run the first script to open an image
      const openGetImage1 = 'app.activeDocument.resizeImage(1080,1350);';
      iframe.contentWindow.postMessage(openGetImage1, '*');
     // Wait 2 seconds (2000 ms) and then run the second script
    }
  };
const handleInstaAspectRatio=async ()=>{
  const { current: iframe } = iframeRef;
  
  if (iframe) {
    // Example: Run the first script to open an image
    const openImageScript = 'app.activeDocument.resizeCanvas(1080,1350);';
    iframe.contentWindow.postMessage(openImageScript, '*');
   // Wait 2 seconds (2000 ms) and then run the second script
  }
  setTimeout(() => {
    const openGetImage = 'app.activeDocument.saveToOE("png");';
    iframe.contentWindow.postMessage(openGetImage, '*');
  }, 1000);
  
  setTimeout(async () => {
    try {
      const base64String = await arrayBufferToBase64(ImageBuffer);
      const new_url = await sendImageBuffer(base64String);
      console.log('Image buffer saved successfully. URL:', new_url);
  
      const openNewURL = `app.open('${new_url}');`;
      iframe.contentWindow.postMessage(openNewURL, '*');
    } catch (error) {
      console.error('Error saving image buffer:', error);
    }
  }, 3000);

  
};

 

  return (
    <div style={{ width: '100vh', height: '100vh' }}>
    <h2>Photopea Integration</h2>
    <select
      value={selectedPrompt}
      onChange={(e) => setSelectedPrompt(e.target.value)}
    >
      {samplePrompts.map((prompt, index) => (
        <option key={index} value={prompt}>
          {prompt}
        </option>
      ))}
    </select>
    <textarea
      value={additionalSpecifications}
      onChange={(e) => setAdditionalSpecifications(e.target.value)}
      placeholder="Additional specifications"
    />
    <button onClick={handleGenerateImage} disabled={loading}>
      {loading ? "Generating Image..." : "Generate Image"}
    </button>
    <input
        type="text"
        value={inpaintingText}
        onChange={(e) => setInpaintingText(e.target.value)}
      />
    <button onClick={handleInpainting} >
      Inpainting
    </button>
    <button onClick={handleInpainting1} >
      Start Inpainting
    </button>
    <select value={aspectRatio} onChange={handleAspectRatioChange} disabled={!base64Data || loading}>
      <option value="instagram">Instagram</option>
      <option value="whatsapp">WhatsApp</option>
      <option value="linkedin">LinkedIn</option>
    </select>
    <button onClick={runCustomScript}>Run Custom Script</button>
    <button onClick={handleInstaAspectRatio}>Insta</button>
    <button onClick={handleRaarrrr}>RAAAAAAAAAAAR</button>
    <button onClick={handleDatatobase64}>   Testingg butttonn</button>
    {error && <p style={{ color: 'red' }}>{error}</p>}
    {photopeaUrl && (
      <>
        
        <iframe
        title="Photopea"
        ref={iframeRef}
        src={photopeaUrl}
        style={{ width: '800px', height: '500px', border: 'none' }}
        onLoad={handleIframeLoad}
      />
      </>
    )}
  </div>
  );
};

export default ImageEditor;
