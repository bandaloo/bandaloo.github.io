Cole Granof
2/23/18
Computer Graphics: Final Project Part I

The program can be run by opening index.html in a browser that supports WebGL. I tested my program using Chrome.

The lib folder includes the scripts and shaders provided to us by the example files.

In my program, I push all the data for the vertices and the normals for both the cube and the sphere into the buffer at once so I do not have to keep rebinding the buffer each time I want to draw a different shape. Instead, I just draw from a different point in the buffer depending on whether I want to draw a cube or a sphere.

I used a tree structure to store the relationships between the different objects in the mobile. I push and pop from the matrix stack during this tree traversal.

I used and slightly modified functions for generating cubes and spheres from the example code in class.

Here are the controls as listed on the page when the program is run:

'm' for Gouraud shading, 'M' for flat shading 
'p' to reduce spotlight angle, 'P' to increase spotlight angle 
's' to speed up animation, 'S' to slow down animation 
'r' to randomize shapes and colors, 'R' to randomize rotations

The extra credit features as listed in the comments of the javascript file projectf1.js is repeated here:

- Press 'r' to randomize all the shapes and colors of items on the mobile
- Press 'R' to give the mobile a whirl and randomize the rotations
- Press 's' to speed up the animation
- Press 'S' to slow down the animation
- The bars that hold up items are 3D shaded objects instead of 2D lines