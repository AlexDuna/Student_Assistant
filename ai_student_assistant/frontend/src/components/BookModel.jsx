import React, {useRef} from "react";
import {useGLTF, OrbitControls} from '@react-three/drei';
import { Canvas, useFrame } from "@react-three/fiber";

const Book = () =>{
    const {scene} = useGLTF('/assets/models/book.glb');
    const ref = useRef();

    //Efect de plutire
    useFrame(({ clock }) => {
        if(ref.current){
            ref.current.position.y = Math.sin(clock.getElapsedTime()) * 0.3; //oscilare subtila
        }
       
    });

    return <primitive object={scene} ref={ref} scale={0.6} position={[0 , -0.3 , 0]} rotation={[-Math.PI / 4, -Math.PI / 4, -Math.PI / 6]}/>;
};

const BookModel = () => {
    return(
        <div style={{marginTop: 90}}>
        <Canvas style={{width: 700, height: 550}} camera={{fov: 50}}>
            <ambientLight intensity={0.7} />
            <directionalLight position={[2,2,2]}/>
            <Book />
            <OrbitControls enableZoom={false} enableRotate={false} enablePan={false} autoRotate autoRotateSpeed={1.5} />
        </Canvas>
        </div>
    );
};

export default BookModel;