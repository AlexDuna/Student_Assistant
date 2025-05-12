/*import React, {useRef} from "react";
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

    return <primitive object={scene} ref={ref} scale={0.6} position={[0 , -0.3 , 0 ]} rotation={[-Math.PI / 4, -Math.PI / 4, -Math.PI / 6]} />;
};

const BookModel = () => {
    return(
        <div style={{marginTop: 90}}>
        <Canvas 
        shadows
        style={{width: 700, height: 550}} 
        camera={{fov: 50}} 
        >
            <ambientLight intensity={0.7} />
            <directionalLight position={[2,2,2]} intensity={1}/>
            <Book/>
            <OrbitControls 
            enableZoom={false} 
            enableRotate={false} 
            enablePan={false} 
            autoRotate 
            autoRotateSpeed={1.5} 
            />
        </Canvas>
        </div>
    );
};

export default BookModel;
*/

import React, { useRef, useEffect } from "react";
import { useGLTF, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";

const Book = () => {
  const { scene } = useGLTF("/assets/models/book.glb");
  const ref = useRef();

  // Plutire
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.position.y = Math.sin(clock.getElapsedTime()) * 0.3;
    }
  });

  // Activează umbra pe toate mesh-urile
  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = false;
      }
    });
  }, [scene]);

  return (
    <primitive
      object={scene}
      ref={ref}
      scale={0.6}
      position={[0, -0.3, 0]}
      rotation={[-Math.PI / 4, -Math.PI / 4, -Math.PI / 6]}
    />
  );
};

const BookModel = () => {
  return (
    <div style={{ marginTop: 90 }}>
      <Canvas
        shadows
        style={{ width: 700, height: 550 }}
        camera={{ fov: 50}}
      >
        {/* Lumini */}
        <ambientLight intensity={0.4} />
        <directionalLight
          castShadow
          position={[1, 5, 0]}
          intensity={1.2}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-near={1}
          shadow-camera-far={10}
          shadow-camera-left={-5}
          shadow-camera-right={5}
          shadow-camera-top={5}
          shadow-camera-bottom={-5}
        />

        {/* Model */}
        <Book />

        {/* Podea care primește umbra */}
        <mesh
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -1, 0]}
        >
        <planeGeometry args={[10, 10]} />
        <shadowMaterial opacity={0.25} />
        </mesh>
        



        <OrbitControls
          enableZoom={false}
          enableRotate={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={1.5}
        />
      </Canvas>
    </div>
  );
};

export default BookModel;
