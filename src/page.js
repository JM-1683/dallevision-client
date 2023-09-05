//The main page.
import './page.css';
import React from 'react';
import Canvas from './canvas.js'

const Page = () => {
    return (
        <div className="container">
            <div className="navbar1">
                <div className="heading">
                    DALLEVISION
                </div>
            </div>
            <Canvas />
        </div>
    )
}

export default Page;