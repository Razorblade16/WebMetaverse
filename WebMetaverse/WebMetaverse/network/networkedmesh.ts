﻿module WM.Network {
    export class NetworkedMesh {

        mesh: THREE.Mesh;
        buffer: StateBuffer;

        static interpolation: number = 150; //How long in the past other people are shown.


        constructor(mesh: THREE.Mesh) {
            this.mesh = mesh;
            this.buffer = new StateBuffer(16);
        }


        update() {
            var interpTime = Date.now() - NetworkedMesh.interpolation;

            var newest = this.buffer.getNewest();
            if (!newest) {//no package received yet
                return;
            }

            //if (interpTime < newest.time) { //We can probably interpolate!

            //}
            //else { //extrapolate!
                 var extrapolationTime = interpTime - newest.time;
                 this.mesh.position.copy(newest.pos).add( newest.vel.clone().multiplyScalar(extrapolationTime));
                 this.mesh.rotation.copy(newest.rot);
            //}

        }

        receivePosition(data: PositionPacket) {

            if (this.buffer.getNewest() && this.buffer.getNewest().time > data.ts) {
                console.log("Already have a newer state, inserting is not worth the effort, discarding");
                //It does however still hold value, as it allows for more precise interpolation.
                return;
            }


            var state = {
                time: data.ts,
                pos: new THREE.Vector3(data.x, data.y, data.z),
                rot: new THREE.Euler(0, data.ry, 0),
                vel: new THREE.Vector3() //To be set if velocity is known
            }

            var before = this.buffer.getBeforeState(state);
            if (before) {
                
                var timeDifference = state.time - before.time;
                var positionDifference = new THREE.Vector3().subVectors(state.pos, before.pos);
                state.vel = positionDifference.divideScalar(timeDifference);
            } 
            //console.log("determined velocity y" + state.vel.y);


            this.buffer.push(state);
        }





    }

    export interface PositionPacket {
        t: any;
        ts: number; //timestamp
        x: number;
        y: number;
        z: number;
        ry: number; //y rotation
    }


    export interface State {
        time: number; //timestamp
        pos: THREE.Vector3;
        vel: THREE.Vector3;
        rot: THREE.Euler;
    }

    export class StateBuffer { //Circular buffer
        buffer: State[];
        pointer: number; //Points to the newest entry

        //         [ 5, 6, 7, 1, 2, 3]
        //                 |     
        //               pointer      

        constructor(length: number) {
            this.buffer = [];
            this.buffer.length = length;
            this.pointer = 0;
        }

        push(state: State) {
            if (this.buffer[this.pointer] && this.getNewest().time > state.time) {
                console.log("Already have a newer state, inserting is not worth the effort, discarding");
            }

            this.buffer[(this.pointer + 1) % this.buffer.length] = state;
            this.pointer = (this.pointer + 1) % this.buffer.length;
        }

        get(index): State {
            return this.buffer[index];
        }

        getNewest(): State {
            return this.buffer[this.pointer];
        }

        /**
        * Returns the state before given index, so if index is 1, it returns state at index 0.
        */
        getBeforeIndex(index: number): State {
            return this.buffer[(this.buffer.length + index - 1) % this.buffer.length];
        }

        /**
        * Returns the state before timestamp, null if not present.
        */
        getBeforeTimestamp(timestamp: number): State {
            var index = this.pointer;

            do {
                if (this.buffer[index] && this.buffer[index].time < timestamp) {
                    return this.buffer[index];
                }
                index = (this.buffer.length + index - 1) % this.buffer.length;
            }
            while (index != this.pointer);

            return null;
        }


        getBeforeState(state: State): State {
            return this.getBeforeTimestamp(state.time);
        }
    }


}