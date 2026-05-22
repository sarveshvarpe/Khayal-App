import os
from PIL import Image, ImageDraw

def create_heartbeat_icon(size, output_path):
    # Create a transparent background image
    image = Image.new("RGBA", (size, size), (255, 255, 255, 0))
    draw = ImageDraw.Draw(image)
    
    # Coordinates for the "Activity" heartbeat icon (scaled to size)
    # Original SVG: viewBox="0 0 24 24", points="22 12 18 12 15 21 9 3 6 12 2 12"
    
    def scale(val):
        return int((val / 24) * size)
        
    points = [
        (scale(2), scale(12)),
        (scale(6), scale(12)),
        (scale(9), scale(3)),
        (scale(15), scale(21)),
        (scale(18), scale(12)),
        (scale(22), scale(12))
    ]
    
    # Calculate line width based on size
    line_width = max(2, int(size * 0.1))
    
    # Draw the heartbeat line (using a vibrant primary green color: #10b981 or similar)
    draw.line(points, fill="#22c55e", width=line_width, joint="curve")
    
    image.save(output_path)

if __name__ == "__main__":
    public_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "frontend", "public")
    
    # Create favicons
    create_heartbeat_icon(16, os.path.join(public_dir, "favicon-16x16.png"))
    create_heartbeat_icon(32, os.path.join(public_dir, "favicon-32x32.png"))
    create_heartbeat_icon(180, os.path.join(public_dir, "apple-touch-icon.png"))
    create_heartbeat_icon(192, os.path.join(public_dir, "android-chrome-192x192.png"))
    create_heartbeat_icon(512, os.path.join(public_dir, "android-chrome-512x512.png"))
    
    # Create ICO file (can contain multiple sizes)
    img_16 = Image.open(os.path.join(public_dir, "favicon-16x16.png"))
    img_32 = Image.open(os.path.join(public_dir, "favicon-32x32.png"))
    img_64 = Image.new("RGBA", (64, 64), (255, 255, 255, 0))
    d64 = ImageDraw.Draw(img_64)
    d64.line([(5, 32), (16, 32), (24, 8), (40, 56), (48, 32), (59, 32)], fill="#22c55e", width=6, joint="curve")
    
    img_64.save(os.path.join(public_dir, "favicon.ico"), format="ICO", sizes=[(16, 16), (32, 32), (64, 64)], append_images=[img_16, img_32])
    print("Favicons generated successfully!")
