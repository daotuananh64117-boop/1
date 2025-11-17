
import { GoogleGenAI, Modality, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
import type { Character, Setting, ImageResult } from '../App';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const safetySettings = [
    {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
];

const createImageStylePromptSuffix = (setting: Setting | null, language: string = 'Vietnamese'): string => {
    const dateText = (setting?.time?.split(',')[0] || 'NOVEMBER 2ND, 1993').toUpperCase();
    const timeText = (setting?.time?.split(',')[1]?.trim() || '5:13 PM EST').toUpperCase();

    if (language.toLowerCase() !== 'vietnamese') {
        // ENGLISH VERSION
        return `
**MASTER COMMAND: You are an AI image generator specialized in creating visuals for a high-budget, technically accurate "Aviation Accident Investigation" documentary. Every image you generate MUST strictly adhere to the following style guide. This is not a suggestion. Deviation is not permitted.**

**STYLE GUIDE (MANDATORY): "Aviation Accident Investigation Documentary"**

**MOST IMPORTANT RULE: Thoroughly analyze the main prompt and select ONE (1) most suitable graphic style from the GRAPHIC TOOLKIT below (A to K) to apply. Do not combine multiple styles unless explicitly requested by the prompt. Clarity and focus are key.**

**1. Core Aesthetics:**
   - **Render Style:** High-quality, clean, photorealistic 3D CGI rendering. The style must be serious, cinematic, like a still from a high-end documentary (e.g., 'Mayday' or 'Air Crash Investigation').
   - **Atmosphere:** Create a dramatic, tense, and moody atmosphere. Use lighting from dusk, dawn, or nighttime. Add realistic environmental effects like fog, smoke, rain, or low clouds to enhance the drama.
   - **Camera Angles:** Use wide, cinematic, impactful camera angles. The composition must be professional and visually striking. Avoid flat, boring angles.
   - **Adaptive Background:** When the prompt focuses on a specific technical detail (e.g., 'engine fire', 'part failure'), the background can be stylized into a minimalist, dark wireframe or a blurred background to focus attention on the main subject (aircraft, vehicle). For panoramic or contextual shots, use a realistic background.

**2. GRAPHIC TOOLKIT (Choose ONE):**
   - The image MUST contain graphic overlays rendered directly onto the image. **Choose the MOST SUITABLE overlay type for the description in the main prompt.** This is a non-negotiable requirement.

   **A) For Critical Scenes (Takeoff, Landing, Emergency, Introduction): Use "FULL LAYOUT"**
     - **Top Title Bar:** A black rectangular bar, extending the full width at the top. Inside, display white text, sans-serif font, ALL CAPS. The text must be inferred from the main prompt in the format 'CATEGORY - DETAIL'. Example: 'FLIGHT SEQUENCE - TAKEOFF CLEARANCE' or 'EMERGENCY - LOSS OF CONTROL'.
     - **Bottom-Left Info Box:** A black rectangular box with a thick yellow border in the bottom-left corner. It must contain two lines of white text, sans-serif font, ALL CAPS:
       - \`DATE: ${dateText}\`
       - \`TIME: ${timeText}\`
     - **Bottom-Right Logo:** A simple, stylized, white four-pointed star logo in the bottom-right corner.

   **B) For Technical Explanations or Pointing out Parts: Use "ANNOTATION LABELS"**
     - **Style:** Simple text labels to indicate specific objects, events, or areas.
     - **Design:**
       - Option 1: Yellow text, ALL CAPS, no background box.
       - Option 2: White text, ALL CAPS, inside a black rectangular box.
     - **Leader Lines:** Use thin, clean lines (white or light gray) to connect the label to the corresponding part in the image.
     - **Example:** 'ENGINE LOSES THRUST', 'FUEL SYSTEM PROBLEM', 'ENGINE FIRE', 'FUSELAGE RUPTURE', 'LOCALIZER ANTENNA'.

   **C) For Scenes Showing Maps and Flight Paths: Use "FLIGHT PATH MAP"**
     - **Background:** A realistic, high-quality satellite map, focused on the geographic area of the journey.
     - **Flight Path:** A thick, bright YELLOW curved line connecting the start and end points. The endpoints (cities/airports) must be highlighted with a yellow circle or glowing dot.
     - **Text & Info Overlays (important):** Use a combination of the following elements to convey information clearly and professionally.
       - **Title Box (Top-Left):** A black rectangle with a YELLOW border. White text inside, ALL CAPS, describing the journey. Example: 'LENGTHY TRANSPACIFIC JOURNEY'.
       - **Data Box (Near the flight path):** A black rectangle with a WHITE border. White text inside, ALL CAPS, displaying specific data. Example: 'FLIGHT DURATION: 8 HRS 20 MINS'.
       - **Location Labels (Near endpoints):** White text, ALL CAPS. The top line is larger (city name), the bottom line is smaller (airport details). A small plane icon can be added next to the city name. Example: 'LOUISVILLE, KENTUCKY' with a sub-line 'UPS WORLDPORT - PRIMARY GLOBAL HUB'.
       - **Logo:** The logo of the relevant airline (e.g., UPS) can be added in the bottom-left corner for authenticity. The four-pointed star logo remains in the bottom-right.

   **D) For Scenes Showing Aircraft Interiors: Use "X-RAY/CUTAWAY MODE"**
     - **Effect:** Use a transparent, cutaway, or "x-ray" effect to reveal the internal components of the aircraft (e.g., fuel tanks, hydraulic systems, frame structure).
     - **Color Highlighting:** Highlight specific systems or parts with vibrant, glowing colors to indicate their status. Example: glowing teal for the fuel system, red for a failed engine, hot orange/yellow for an active engine.
     - **Labels:** Use "ANNOTATION LABELS" (style B) to identify the internal or external parts being highlighted.

   **E) For Scenes Showing Measurement Data (distance, altitude): Use "3D DATA DISPLAY"**
     - **Purpose:** To display measurement data like distance, altitude, or speed directly onto the 3D environment.
     - **Text:** Large, ALL CAPS, bold sans-serif font. The text must be rendered in 3D and follow the perspective of the scene.
     - **Effect:** The text and accompanying elements must have a glowing, holographic effect (e.g., bright orange).
     - **Markers:** Use glowing geometric shapes (like squares, tick marks) along the measurement line to visually represent distance or scale.
     - **Example:** Displaying takeoff distance on a runway ('1200 METERS / 3940 FEET'), aircraft altitude above the ground, or the radius of an airspace zone.

   **F) For Representing People: Use "GLOWING SILHOUETTES"**
     - **Purpose:** To represent human characters (pilots, crew, witnesses) in a stylized, anonymous, and dramatic way.
     - **Form:** The figures should be simple silhouettes, without facial features or detailed clothing.
     - **Effect:** The entire silhouette must have a strong, monochromatic, neon-like glowing effect.
     - **Color:** Use a single, consistent glowing color (e.g., BRIGHT RED) for all human figures to maintain a unified, schematic look.
     - **Use Case:** Use this style when the prompt describes human actions, positions, or states, especially in dark, dramatic scenes, or when the focus needs to be on their actions rather than their appearance.

   **G) For High-Action or High-Impact Scenes: Use "IMPACT CAPTION BOX"**
     - **Purpose:** To emphasize dramatic, catastrophic moments or high-impact events like crashes, explosions, or severe failures.
     - **Design:** A black rectangular box with a THICK YELLOW border. Inside is white text, sans-serif font, ALL CAPS, short and impactful.
     - **Position:** Place at the top or bottom of the image so as not to obscure the main action.
     - **Example:** 'CATASTROPHIC IMPACT', 'MASSIVE FIREBALL', 'RAPID DECOMPRESSION', 'STRUCTURAL FAILURE'.
     
   **H) For Technical Diagrams & Ground Layouts: Use "3D SCHEMATICS"**
     - **Purpose:** To create clean, schematic-style 3D illustrations of airports, runways, vehicle positions, and technical components.
     - **Aesthetic:** Minimalist, clean, non-photorealistic 3D rendering. Bright, even lighting. Focus on clarity and technical accuracy.
     - **On-Ground Text:** Render large, white, ALL CAPS, sans-serif text directly onto ground surfaces like runways or aprons to label locations. Example: "MUAN INT. AIRPORT".
     - **Component Callouts:** Combine the following elements to highlight specific parts:
       - **Bounding Box:** A semi-transparent, brightly colored (e.g., cyan) bounding box around the object of interest.
       - **Annotation Label:** A black rectangular box with a THICK YELLOW border containing white, ALL CAPS text. A thin, white leader line connects the label to the component. Example: 'LOCALIZER ANTENNA'.

   **I) For Schematizing Technical Incidents: Use "ABSTRACT ILLUSTRATION"**
     - **Purpose:** To illustrate technical incidents in a minimalist, abstract way, focusing on the concept rather than photorealism. Often used for top-down views.
     - **Aesthetic:** Stylized, clean 2D/3D graphics on a simple background (e.g., sea surface, blurred sky).
     - **Graphic Elements:** Use glowing lines, arrows, and colored zones (e.g., yellow) to illustrate unseen forces, failures, or paths.
     - **Text:** Use large, ALL CAPS, brightly colored (e.g., yellow) text placed directly on the image without a background box. The text should be short and impactful.
     - **Example:** Illustrating an aircraft from above with glowing yellow lines indicating a landing gear failure, accompanied by the text 'LANDING GEAR FAILED TO OPEN'.

   **J) For Radar & Geographic Data Schematics: Use "GEODATA VISUALIZATION"**
     - **Purpose:** To visualize radar data, flight paths, and operational zones on a geographical map.
     - **Background:** A realistic satellite image from above, but desaturated or converted to grayscale so that graphic overlays stand out.
     - **Graphic Overlays (MANDATORY):**
       - **Radar Pings:** Concentric, glowing circles (orange or yellow) emitting from a source (e.g., a 3D rendered air traffic control tower).
       - **Marked Zone:** A large, semi-transparent colored fill (e.g., orange) to designate a specific area like 'Bird Activity' or 'Weather Zone'.
       - **Flight Path/Vector:** Glowing lines, possibly dashed or chevron-shaped (e.g., green) to indicate direction of movement or flight path.
     - **Labels:** Bright yellow, ALL CAPS, sans-serif text. Thin, yellow leader lines connect the text to the corresponding point on the map. Example: 'CONTROL TOWER', 'BIRD ACTIVITY'.

   **K) For Simulation/Diorama View: Use "DIORAMA ILLUSTRATION"**
     - **Purpose:** To create top-down, diorama-style views of events (e.g., explosions, impacts) in a clean, simulated environment.
     - **Aesthetic:**
       - **Perspective:** High-angle, wide-angle top-down view.
       - **Ground:** A minimalist, dark gray-blue plane with a white coordinate grid (composed of small plus signs at intersections) overlaid.
       - **Buildings & Trees:** Simple, untextured 3D models. White buildings, dark green trees, like in an architectural model. Debris is also simple white geometric shapes.
       - **Main Event (Explosion/Impact):** In contrast to the minimalist environment, the main event should be rendered realistically with fire, smoke, and vivid detail to create a strong contrast.
     - **Use Case:** Perfect for showing the location and scale of an incident in a clear, understandable spatial context without the distraction of unnecessary environmental details.

**3. General Rules:**
   - **Font:** Always use a bold, clear, ALL CAPS sans-serif font for all text.
   - **Accuracy:** Prioritize technical accuracy in depicting aircraft, cockpits, and environments.
   - **Aspect Ratio:** Strictly 16:9 (widescreen).
   - **Resolution:** 4K, hyper-detailed.
`;
    }
    
    // VIETNAMESE VERSION (the original)
    return `
**MASTER COMMAND: You are an AI image generator specialized in creating visuals for a high-budget, technically accurate "Aviation Accident Investigation" documentary. Every image you generate MUST strictly adhere to the following style guide. This is not a suggestion. Deviation is not permitted.**

**HƯỚNG DẪN PHONG CÁCH (BẮT BUỘC): "Phim tài liệu điều tra tai nạn hàng không"**

**QUY TẮC QUAN TRỌNG NHẤT: Phân tích kỹ lưỡng prompt chính và chọn MỘT (1) phong cách đồ họa phù hợp nhất từ BỘ CÔNG CỤ ĐỒ HỌA bên dưới (từ A đến K) để áp dụng. Không kết hợp nhiều phong cách trừ khi prompt yêu cầu rõ ràng. Sự rõ ràng và tập trung là yếu tố then chốt.**

**1. Thẩm mỹ cốt lõi:**
   - **Phong cách render:** Render CGI 3D chất lượng cao, sạch sẽ và siêu thực. Phong cách phải nghiêm túc, đậm chất điện ảnh, giống như một khung hình tĩnh từ một bộ phim tài liệu cao cấp (ví dụ: 'Mayday' hoặc 'Air Crash Investigation').
   - **Không khí:** Tạo ra một không khí kịch tính, căng thẳng và có tâm trạng. Sử dụng ánh sáng của hoàng hôn, bình minh hoặc ban đêm. Thêm các hiệu ứng môi trường thực tế như sương mù, khói, mưa hoặc mây thấp để tăng cường kịch tính.
   - **Góc máy:** Sử dụng các góc máy rộng, điện ảnh, ấn tượng. Bố cục phải chuyên nghiệp và có tác động thị giác mạnh mẽ. Tránh các góc máy phẳng, nhàm chán.
   - **Nền thích ứng:** Khi prompt tập trung vào một chi tiết kỹ thuật cụ thể (ví dụ: 'cháy động cơ', 'hỏng hóc bộ phận'), nền có thể được cách điệu hóa thành một bản đồ đường nét tối giản, màu tối hoặc nền mờ để tập trung sự chú ý vào chủ thể chính (máy bay, xe cộ). Đối với các cảnh quay toàn cảnh hoặc bối cảnh, hãy sử dụng nền thực tế.

**2. BỘ CÔNG CỤ ĐỒ HỌA (Chọn MỘT):**
   - Hình ảnh BẮT BUỘC phải chứa các lớp phủ đồ họa được render trực tiếp lên hình ảnh. **Hãy chọn loại lớp phủ PHÙ HỢP NHẤT với mô tả trong prompt chính.** Đây là một yêu cầu không thể thương lượng.

   **A) Dành cho các cảnh quan trọng (Cất cánh, Hạ cánh, Khẩn cấp, Giới thiệu): Sử dụng "BỐ CỤC TOÀN DIỆN"**
     - **Thanh tiêu đề trên cùng:** Một thanh hình chữ nhật màu đen, kéo dài toàn bộ chiều rộng ở phía trên cùng. Bên trong, hiển thị văn bản màu trắng, phông chữ sans-serif, VIẾT HOA. Văn bản phải được suy ra từ prompt chính theo định dạng 'DANH MỤC - CHI TIẾT'. Ví dụ: 'FLIGHT SEQUENCE - TAKEOFF CLEARANCE' hoặc 'EMERGENCY - LOSS OF CONTROL'.
     - **Hộp thông tin dưới cùng bên trái:** Một hộp hình chữ nhật màu đen với viền vàng dày ở góc dưới cùng bên trái. Nó phải chứa hai dòng văn bản màu trắng, phông chữ sans-serif, VIẾT HOA:
       - \`DATE: ${dateText}\`
       - \`TIME: ${timeText}\`
     - **Logo dưới cùng bên phải:** Một logo hình ngôi sao bốn cánh đơn giản, cách điệu, màu trắng ở góc dưới cùng bên phải.

   **B) Dành cho các cảnh giải thích kỹ thuật hoặc chỉ ra các bộ phận: Sử dụng "NHÃN CHÚ THÍCH"**
     - **Phong cách:** Các nhãn văn bản đơn giản để chỉ ra các đối tượng, sự kiện hoặc khu vực cụ thể.
     - **Thiết kế:**
       - Lựa chọn 1: Văn bản màu vàng, VIẾT HOA, không có hộp nền.
       - Lựa chọn 2: Văn bản màu trắng, VIẾT HOA, bên trong một hộp hình chữ nhật màu đen.
     - **Đường chỉ dẫn:** Sử dụng các đường mỏng, sạch sẽ (màu trắng hoặc xám nhạt) để nối nhãn với phần tương ứng trên hình ảnh.
     - **Ví dụ:** 'ENGINE LOSE THRUST', 'FUEL SYSTEM PROBLEM', 'ENGINE FIRE', 'FUSELAGE RUPTURE', 'LOCALIZER ANTENNA'.

   **C) Dành cho các cảnh hiển thị bản đồ và lộ trình bay: Sử dụng "BẢN ĐỒ LỘ TRÌNH BAY"**
     - **Nền:** Một bản đồ vệ tinh thực tế, chất lượng cao, tập trung vào khu vực địa lý của hành trình.
     - **Đường bay:** Một đường kẻ cong, dày, màu VÀNG rực rỡ nối giữa điểm đầu và điểm cuối. Các điểm cuối (thành phố/sân bay) phải được làm nổi bật bằng một vòng tròn hoặc điểm phát sáng màu vàng.
     - **Lớp phủ văn bản & thông tin (quan trọng):** Sử dụng kết hợp các yếu tố sau để truyền tải thông tin một cách rõ ràng và chuyên nghiệp.
       - **Hộp tiêu đề (Góc trên bên trái):** Một hình chữ nhật màu đen với đường viền MÀNG VÀNG. Văn bản bên trong màu trắng, VIẾT HOA, mô tả hành trình. Ví dụ: 'LENGTHY TRANSPACIFIC JOURNEY'.
       - **Hộp dữ liệu (Gần đường bay):** Một hình chữ nhật màu đen với đường viền TRẮNG. Văn bản bên trong màu trắng, VIẾT HOA, hiển thị dữ liệu cụ thể. Ví dụ: 'FLIGHT DURATION: 8 HRS 20 MINS'.
       - **Nhãn vị trí (Gần điểm cuối):** Văn bản màu trắng, VIẾT HOA. Dòng trên lớn hơn (tên thành phố), dòng dưới nhỏ hơn (chi tiết sân bay). Có thể thêm một biểu tượng máy bay nhỏ bên cạnh tên thành phố. Ví dụ: 'LOUISVILLE, KENTUCKY' và dòng phụ 'UPS WORLDPORT - PRIMARY GLOBAL HUB'.
     - **Logo:** Có thể thêm logo của hãng hàng không liên quan (ví dụ: UPS) ở góc dưới cùng bên trái để tăng tính chân thực. Logo ngôi sao bốn cánh vẫn ở góc dưới cùng bên phải.

   **D) Dành cho các cảnh hiển thị bên trong máy bay: Sử dụng "CHẾ ĐỘ X-QUANG/CẮT LỚP"**
     - **Hiệu ứng:** Sử dụng hiệu ứng trong suốt, cắt lớp hoặc "x-ray" để lộ các thành phần bên trong của máy bay (ví dụ: bình xăng, hệ thống thủy lực, cấu trúc khung sườn).
     - **Nhấn mạnh bằng màu sắc:** Tô sáng các hệ thống hoặc bộ phận cụ thể bằng màu sắc rực rỡ, phát sáng để biểu thị trạng thái của chúng. Ví dụ: màu xanh mòng két phát sáng cho hệ thống nhiên liệu, màu đỏ cho động cơ bị lỗi, màu cam/vàng nóng sáng cho động cơ đang hoạt động.
     - **Nhãn:** Sử dụng "NHÃN CHÚ THÍCH" (kiểu B) để xác định các bộ phận bên trong hoặc bên ngoài đang được làm nổi bật.

   **E) Dành cho các cảnh hiển thị dữ liệu đo lường (khoảng cách, độ cao): Sử dụng "HIỂN THỊ DỮ LIỆU 3D"**
     - **Mục đích:** Để hiển thị các dữ liệu đo lường như khoảng cách, độ cao, hoặc tốc độ trực tiếp trên môi trường 3D.
     - **Văn bản:** Lớn, VIẾT HOA, phông chữ sans-serif đậm. Văn bản phải được render dưới dạng 3D và tuân theo luật phối cảnh của cảnh quay.
     - **Hiệu ứng:** Văn bản và các yếu tố đi kèm phải có hiệu ứng phát sáng, giống như hologram (ví dụ: màu cam rực rỡ).
     - **Điểm đánh dấu:** Sử dụng các hình khối phát sáng (như hình vuông, vạch kẻ) dọc theo đường đo để thể hiện trực quan khoảng cách hoặc thang đo.
     - **Ví dụ:** Hiển thị khoảng cách cất cánh trên đường băng ('1200 METERS / 3940 FEET'), độ cao của máy bay so với mặt đất, hoặc bán kính của một vùng không phận.

   **F) Dành cho việc thể hiện con người: Sử dụng "HÌNH HỌA PHÁT SÁNG"**
     - **Mục đích:** Để thể hiện các nhân vật con người (phi công, phi hành đoàn, nhân chứng) một cách cách điệu, ẩn danh và đầy kịch tính.
     - **Hình dáng:** Các hình họa phải là những bóng người đơn giản, không có đặc điểm khuôn mặt hay quần áo chi tiết.
     - **Hiệu ứng:** Toàn bộ hình họa phải có hiệu ứng phát sáng mạnh mẽ, đơn sắc, giống như đèn neon.
     - **Màu sắc:** Sử dụng một màu phát sáng nhất quán (ví dụ: ĐỎ TƯƠI) cho tất cả các hình người để duy trì giao diện đồng nhất, có sơ đồ.
     - **Bối cảnh sử dụng:** Sử dụng phong cách này khi prompt mô tả hành động, vị trí, hoặc trạng thái của con người, đặc biệt là trong các cảnh tối, kịch tính, hoặc khi cần tập trung vào hành động của họ hơn là ngoại hình.

   **G) Dành cho các cảnh hành động cao trào hoặc tác động mạnh: Sử dụng "HỘP CHÚ THÍCH TÁC ĐỘNG"**
     - **Mục đích:** Để nhấn mạnh những khoảnh khắc kịch tính, thảm khốc hoặc những sự kiện có tác động lớn như va chạm, nổ, hỏng hóc nghiêm trọng.
     - **Thiết kế:** Một hộp hình chữ nhật màu đen với đường viền MÀNG VÀNG DÀY. Bên trong là văn bản màu trắng, phông chữ sans-serif, VIẾT HOA, ngắn gọn và mạnh mẽ.
     - **Vị trí:** Đặt ở trên cùng hoặc dưới cùng của hình ảnh để không che khuất hành động chính.
     - **Ví dụ:** 'CATASTROPHIC IMPACT', 'MASSIVE FIREBALL', 'RAPID DECOMPRESSION', 'STRUCTURAL FAILURE'.
     
   **H) Dành cho các Sơ đồ Kỹ thuật & Sơ đồ mặt đất: Sử dụng "SƠ ĐỒ HÓA 3D"**
     - **Mục đích:** Để tạo ra các hình ảnh minh họa 3D sạch sẽ, theo kiểu sơ đồ của sân bay, đường băng, vị trí phương tiện và các thành phần kỹ thuật.
     - **Thẩm mỹ:** Render 3D tối giản, sạch sẽ, không theo chủ nghĩa hiện thực ảnh. Ánh sáng sáng sủa, đồng đều. Tập trung vào sự rõ ràng và độ chính xác kỹ thuật.
     - **Văn bản trên mặt đất:** Render văn bản lớn, màu trắng, chữ VIẾT HOA, phông chữ sans-serif trực tiếp lên các bề mặt mặt đất như đường băng hoặc sân đỗ để dán nhãn các vị trí. Ví dụ: "MUAN INT. AIRPORT".
     - **Chú thích thành phần:** Kết hợp các yếu tố sau để làm nổi bật các bộ phận cụ thể:
       - **Hộp giới hạn:** Một hộp giới hạn bán trong suốt, có màu sắc rực rỡ (ví dụ: màu lục lam) xung quanh đối tượng quan tâm.
       - **Nhãn chú thích:** Một hộp hình chữ nhật màu đen với đường viền VÀNG DÀY chứa văn bản màu trắng, VIẾT HOA. Một đường chỉ dẫn mỏng, màu trắng nối nhãn với thành phần. Ví dụ: 'LOCALIZER ANTENNA'.

   **I) Dành cho Sơ đồ hóa Sự cố Kỹ thuật: Sử dụng "MINH HỌA TRỪU TƯỢNG"**
     - **Mục đích:** Để minh họa các sự cố kỹ thuật một cách tối giản, trừu tượng, tập trung vào khái niệm hơn là hiện thực ảnh. Thường được sử dụng cho các góc nhìn từ trên xuống.
     - **Thẩm mỹ:** Đồ họa 2D/3D cách điệu, sạch sẽ trên một nền đơn giản (ví dụ: mặt biển, bầu trời mờ).
     - **Yếu tố đồ họa:** Sử dụng các đường kẻ, mũi tên và vùng màu phát sáng (ví dụ: màu vàng) để minh họa các lực, lỗi hoặc đường đi không nhìn thấy được.
     - **Văn bản:** Sử dụng văn bản lớn, VIẾT HOA, màu sắc rực rỡ (ví dụ: màu vàng) được đặt trực tiếp lên hình ảnh mà không cần hộp nền. Văn bản nên ngắn gọn và có tác động mạnh.
     - **Ví dụ:** Minh họa một chiếc máy bay từ trên xuống với các đường màu vàng phát sáng chỉ ra lỗi của bộ phận hạ cánh, kèm theo văn bản 'LANDING GEAR FAIL TO OPEN'.

   **J) Dành cho Sơ đồ Radar & Dữ liệu Địa lý: Sử dụng "MINH HỌA DỮ LIỆU ĐỊA LÝ"**
     - **Mục đích:** Để trực quan hóa dữ liệu radar, đường bay, và các khu vực hoạt động trên một bản đồ địa lý.
     - **Nền:** Một hình ảnh vệ tinh thực tế từ trên cao, nhưng được làm giảm độ bão hòa (desaturated) hoặc chuyển thành thang độ xám để các lớp phủ đồ họa nổi bật.
     - **Lớp phủ đồ họa (BẮT BUỘC):**
       - **Tín hiệu Radar:** Các vòng tròn đồng tâm, phát sáng (màu cam hoặc vàng) phát ra từ một nguồn (ví dụ: tháp kiểm soát không lưu được render 3D).
       - **Vùng được đánh dấu:** Một vùng tô màu lớn, bán trong suốt (ví dụ: màu cam) để chỉ định một khu vực cụ thể như 'Hoạt động của chim' hoặc 'Vùng thời tiết xấu'.
       - **Đường bay/Vector:** Các đường kẻ phát sáng, có thể có dạng gạch đứt hoặc hình chữ V (chevron) (ví dụ: màu xanh lá cây) để chỉ hướng di chuyển hoặc đường bay.
     - **Nhãn:** Văn bản màu vàng sáng, VIẾT HOA, phông chữ sans-serif. Các đường chỉ dẫn mỏng, màu vàng nối văn bản với điểm tương ứng trên bản đồ. Ví dụ: 'CONTROL TOWER', 'BIRD ACTIVITY'.

   **K) Dành cho Chế độ xem Mô phỏng/Sa bàn: Sử dụng "MINH HỌA SA BÀN"**
     - **Mục đích:** Để tạo ra các chế độ xem từ trên cao, kiểu sa bàn của các sự kiện (ví dụ: vụ nổ, va chạm) trong một môi trường mô phỏng, sạch sẽ.
     - **Thẩm mỹ:**
       - **Góc nhìn:** Góc nhìn từ trên cao, góc rộng.
       - **Mặt đất:** Một mặt phẳng màu xanh xám, tối giản với một lưới tọa độ màu trắng (bao gồm các dấu cộng nhỏ ở các giao điểm) phủ lên trên.
       - **Tòa nhà & Cây cối:** Các mô hình 3D đơn giản, không có kết cấu. Tòa nhà màu trắng, cây cối màu xanh đậm, giống như trong một mô hình kiến trúc. Các mảnh vỡ cũng là các khối hình học màu trắng đơn giản.
       - **Sự kiện chính (Vụ nổ/Va chạm):** Trái ngược với môi trường tối giản, sự kiện chính phải được render một cách chân thực với lửa, khói và chi tiết sống động để tạo ra sự tương phản mạnh mẽ.
     - **Bối cảnh sử dụng:** Hoàn hảo để hiển thị vị trí và quy mô của một sự cố trong một bối cảnh không gian rõ ràng, dễ hiểu mà không bị phân tâm bởi các chi tiết môi trường không cần thiết.

**3. Quy tắc chung:**
   - **Phông chữ:** Luôn sử dụng phông chữ sans-serif đậm, rõ ràng, VIẾT HOA cho tất cả các văn bản.
   - **Độ chính xác:** Ưu tiên độ chính xác kỹ thuật trong việc mô tả máy bay, buồng lái và môi trường.
   - **Tỷ lệ khung hình:** Tuyệt đối là 16:9 (màn ảnh rộng).
   - **Độ phân giải:** 4K, siêu chi tiết.
`;
};


const rewritePromptForImageGeneration = async (originalPrompt: string, language: string = 'Vietnamese'): Promise<string> => {
    const rewriteInstruction = `You are a prompt engineer. The following image generation prompt has failed. Rewrite it in ${language} to be more descriptive, clear, and specific. The new prompt should have a higher chance of generating a successful image while preserving the original intent.

Original prompt: "${originalPrompt}"

Return only the rewritten prompt, without any explanations, quotation marks, or extra formatting.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: rewriteInstruction,
            config: {
                safetySettings,
            }
        });

        const rewrittenPrompt = response.text.trim().replace(/^"|"$/g, '');
        console.log(`Original prompt: "${originalPrompt}" | Rewritten prompt: "${rewrittenPrompt}"`);
        
        if (rewrittenPrompt && rewrittenPrompt.length > 10 && rewrittenPrompt !== originalPrompt) {
            return rewrittenPrompt;
        }
        return `A cinematic, hyper-detailed photograph of: ${originalPrompt}`;
    } catch (error) {
        console.error("Error rewriting prompt, using fallback:", error);
        return `A cinematic, hyper-detailed photograph of: ${originalPrompt}`;
    }
};

const dataUrlToPart = (dataUrl: string) => {
    if (!dataUrl.includes(',')) return null;
    const [header, base64Data] = dataUrl.split(',');
    const mimeTypeMatch = header.match(/:(.*?);/);
    if (!base64Data || !mimeTypeMatch || !mimeTypeMatch[1]) {
        return null;
    }
    return {
        inlineData: {
            data: base64Data,
            mimeType: mimeTypeMatch[1],
        },
    };
};

export const detectScriptLanguage = async (script: string): Promise<string> => {
    if (!script || script.trim().length < 20) return 'Vietnamese'; // Default for short/empty scripts
    const prompt = `Detect the primary language of the following text. Respond with only the language name in English (e.g., "Vietnamese", "English").

    Text:
    ---
    ${script.substring(0, 500)}
    ---
    `;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
             config: {
                safetySettings,
            }
        });
        const lang = response.text.trim();
        // Basic validation, return English or Vietnamese for simplicity of this app
        if (lang.toLowerCase().includes('english')) {
            return 'English';
        }
        return 'Vietnamese'; // Default fallback
    } catch (error) {
        console.error("Error detecting language, defaulting to Vietnamese:", error);
        return 'Vietnamese'; // Default on error
    }
};


export const researchAndExtractDetails = async (script: string, language: string = 'Vietnamese'): Promise<{ setting: Setting, characters: Omit<Character, 'id' | 'preview' | 'referenceImageUrl'>[] }> => {
    const prompt_vi = `Với tư cách là một đạo diễn hình ảnh và nhà phân tích kịch bản chuyên nghiệp, hãy đọc kỹ kịch bản sau đây. **Sử dụng Google Search để tra cứu thông tin từ các bài báo, báo cáo tai nạn và dữ liệu lịch sử liên quan đến sự kiện.** Mục tiêu của bạn là trích xuất các chi tiết cực kỳ chính xác về bối cảnh để đảm bảo hình ảnh được tạo ra phù hợp nhất với thực tế.

    **MỤC TIÊU SỐ MỘT CỦA BẠN (CỰC KỲ QUAN TRỌNG):** Phá vỡ mọi giới hạn thông thường để xác định số lượng 'nhân vật' **TỐI ĐA** có thể từ kịch bản. Hãy tư duy như một đạo diễn hình ảnh đang tìm kiếm mọi cảnh quay khả thi, dù là nhỏ nhất.

    **ĐỊNH NGHĨA MỚI VỀ 'NHÂN VẬT':**
    'Nhân vật' không chỉ là người hay vật thể. Đó là **bất kỳ yếu tố nào có thể trở thành tâm điểm của một cảnh quay nghệ thuật hoặc kỹ thuật.** Hãy thật chi tiết và sáng tạo. Hãy chia nhỏ các hệ thống phức tạp thành các thành phần riêng lẻ.

    **DANH SÁCH CÁC HẠNG MỤC CẦN TRÍCH XUẤT (Không giới hạn):**
    1.  **Thực thể Cơ khí & Phương tiện:** Mọi máy bay, tàu, xe. **Phải chia nhỏ:** thay vì chỉ 'Máy bay', hãy xác định 'Cánh chính', 'Đuôi đứng', 'Động cơ số 2', 'Bộ phận hạ cánh', 'Buồng lái'.
    2.  **Con người:** Mọi nhân vật có tên hoặc vai trò (phi công, kiểm soát viên, nhân chứng).
    3.  **Hệ thống & Linh kiện Cụ thể:** Mọi bộ phận máy móc được nhắc đến. **Phải cực kỳ chi tiết:** 'Cần gạt càng', 'Bảng điều khiển', 'Hộp đen', 'Một chiếc bu-lông cụ thể', 'Đồng hồ đo áp suất'.
    4.  **Môi trường & Địa điểm:** Cả bối cảnh chung và các chi tiết cụ thể: 'Đường băng 22L', 'Nhà ga C', 'Một đám mây bão cụ thể', 'Vùng nhiễu động không khí', 'Mặt đất nơi va chạm'.
    5.  **Lực lượng & Tổ chức:** Các nhóm người (ví dụ: 'Đội cứu hộ', 'NTSB', 'Hãng hàng không').
    6.  **Khái niệm Trừu tượng có Thể Hình ảnh hóa:** Các vấn đề kỹ thuật hoặc khái niệm có thể biểu diễn bằng hình ảnh. Đây là hạng mục quan trọng nhất để tạo ra sự khác biệt. Ví dụ: 'Sự mỏi kim loại', 'Sóng âm từ vụ nổ', 'Áp suất cabin đang giảm', 'Lỗi phần mềm trên màn hình', 'Lực G tác động lên phi công', 'Nhiên liệu bị rò rỉ'.
    
    Sau đó, trích xuất thông tin chi tiết và trả về một đối tượng JSON DUY NHẤT có cấu trúc như sau:
    {
      "setting": {
        "place": "Vị trí địa lý và không gian cụ thể.",
        "time": "Thời gian lịch sử, ngày giờ chính xác của sự kiện (buổi sáng, buổi trưa, ban đêm).",
        "weather": "Điều kiện thời tiết tại thời điểm xảy ra sự kiện (nắng, mưa, mây mù, tuyết).",
        "season": "Mùa trong năm (xuân, hạ, thu, đông).",
        "mood": "Bầu không khí, cảm giác mà bối cảnh tạo ra.",
        "socialContext": "Bối cảnh xã hội, luật lệ, công nghệ.",
        "theme": {
          "centralIdea": "Ý tưởng trung tâm của câu chuyện (VD: sự cố kỹ thuật, sai lầm con người).",
          "thematicQuestion": "Câu hỏi triết lý mà câu chuyện đặt ra."
        }
      },
      "characters": [
        {
          "name": "Tên nhân vật/thực thể (VD: Máy bay UPS 5X214).",
          "isMain": "true nếu đây là nhân vật trung tâm, ngược lại false.",
          "goal": "Mục tiêu rõ ràng của nhân vật trong kịch bản.",
          "motivation": "Lý do cảm xúc đằng sau mục tiêu.",
          "conflict": "Trở ngại chính (bên trong hoặc bên ngoài) mà nhân vật phải đối mặt.",
          "appearanceAndBehavior": "Mô tả ngoại hình và hành vi chi tiết để tạo mô hình 3D.",
          "backstory": "Lý lịch hoặc chuyên môn kỹ thuật liên quan.",
          "characterArc": "Sự thay đổi của nhân vật từ đầu đến cuối."
        }
      ]
    }
    KỊCH BẢN:
    ---
    ${script}
    ---
    LƯU Ý QUAN TRỌNG: Chỉ trả về đối tượng JSON, không có bất kỳ văn bản giải thích nào khác. Hãy đảm bảo danh sách nhân vật càng dài và chi tiết càng tốt.`;

    const prompt_en = `As a professional cinematographer and script analyst, carefully read the following script. **Use Google Search to look up information from articles, accident reports, and historical data related to the event.** Your goal is to extract extremely accurate details about the context to ensure the generated images are as true to reality as possible.

    **YOUR NUMBER ONE GOAL (CRITICALLY IMPORTANT):** Break all conventional limits to identify the **MAXIMUM** possible number of 'characters' from the script. Think like a cinematographer looking for every possible shot, no matter how small.

    **NEW DEFINITION OF 'CHARACTER':**
    A 'character' is not just a person or an object. It is **any element that can become the focus of an artistic or technical shot.** Be detailed and creative. Break down complex systems into their individual components.

    **LIST OF CATEGORIES TO EXTRACT (Not limited to):**
    1.  **Mechanical Entities & Vehicles:** Every aircraft, ship, vehicle. **Must be broken down:** instead of just 'Airplane', identify 'Main Wing', 'Vertical Stabilizer', 'Engine No. 2', 'Landing Gear', 'Cockpit'.
    2.  **People:** Every character with a name or role (pilot, controller, witness).
    3.  **Specific Systems & Components:** Every piece of machinery mentioned. **Be extremely detailed:** 'Gear Lever', 'Control Panel', 'Black Box', 'A specific bolt', 'Pressure Gauge'.
    4.  **Environments & Locations:** Both general settings and specific details: 'Runway 22L', 'Terminal C', 'A specific storm cloud', 'Zone of turbulence', 'The ground at the point of impact'.
    5.  **Forces & Organizations:** Groups of people (e.g., 'Rescue Team', 'NTSB', 'The Airline').
    6.  **Visualizable Abstract Concepts:** Technical issues or concepts that can be represented visually. This is the most important category for creating distinction. Examples: 'Metal Fatigue', 'Soundwave from the explosion', 'Decreasing cabin pressure', 'Software glitch on a screen', 'G-force acting on the pilot', 'Leaking fuel'.
    
    Then, extract the detailed information and return a SINGLE JSON object structured as follows:
    {
      "setting": {
        "place": "Specific geographical and spatial location.",
        "time": "Historical time, exact date and time of the event (morning, noon, night).",
        "weather": "Weather conditions at the time of the event (sunny, rainy, foggy, snowy).",
        "season": "Season of the year (spring, summer, autumn, winter).",
        "mood": "The atmosphere, the feeling the setting creates.",
        "socialContext": "The social context, regulations, technology.",
        "theme": {
          "centralIdea": "The central idea of the story (e.g., technical failure, human error).",
          "thematicQuestion": "The philosophical question the story poses."
        }
      },
      "characters": [
        {
          "name": "Name of the character/entity (e.g., UPS Flight 5X214).",
          "isMain": "true if this is a central character, otherwise false.",
          "goal": "The character's clear objective in the script.",
          "motivation": "The emotional reason behind the goal.",
          "conflict": "The main obstacle (internal or external) the character faces.",
          "appearanceAndBehavior": "Detailed description of appearance and behavior for 3D modeling.",
          "backstory": "Relevant background or technical expertise.",
          "characterArc": "The character's change from beginning to end."
        }
      ]
    }
    SCRIPT:
    ---
    ${script}
    ---
    IMPORTANT NOTE: Only return the JSON object, without any other explanatory text. Ensure the character list is as long and detailed as possible.`;
    
    const prompt = language.toLowerCase() === 'vietnamese' ? prompt_vi : prompt_en;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                safetySettings,
            }
        });

        let jsonString = response.text.trim();
        const match = jsonString.match(/```json\n([\s\S]*?)\n```/);
        if (match) {
            jsonString = match[1];
        }

        return JSON.parse(jsonString);

    } catch (error) {
        console.error("Lỗi khi phân tích kịch bản:", error);
        throw new Error("Không thể phân tích kịch bản và trích xuất chi tiết.");
    }
};

export const generateImage = async (prompt: string, setting: Setting | null, styleReferences: ImageResult[] = [], language: string = 'Vietnamese'): Promise<string> => {
    const imageStylePrompt = createImageStylePromptSuffix(setting, language);
    let currentPrompt = prompt;
    const maxRetries = 2;
    const isVietnamese = language.toLowerCase() === 'vietnamese';

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const parts: any[] = [];
            
            let textPrompt = isVietnamese
                ? `Phân tích phong cách (màu sắc, ánh sáng, bố cục) từ các hình ảnh tham khảo được cung cấp. Sau đó, tạo một hình ảnh mới dựa trên prompt sau: "${currentPrompt}". Hình ảnh mới PHẢI khớp với phong cách của các hình tham khảo.`
                : `Analyze the style (color, lighting, composition) from the provided reference images. Then, create a new image based on the following prompt: "${currentPrompt}". The new image MUST match the style of the references.`;

            textPrompt += `\n\n${imageStylePrompt}`;
            parts.push({ text: textPrompt });

            for (const ref of styleReferences) {
                if (ref.url) {
                    const imagePart = dataUrlToPart(ref.url);
                    if (imagePart) parts.push(imagePart);
                }
            }

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts },
                config: {
                    responseModalities: [Modality.IMAGE],
                    safetySettings,
                },
            });

            const candidate = response?.candidates?.[0];
            if (candidate && candidate.content && Array.isArray(candidate.content.parts)) {
                for (const part of candidate.content.parts) {
                    if (part?.inlineData?.data) {
                        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                    }
                }
            }

            const blockReason = response?.promptFeedback?.blockReason;
            if (blockReason) throw new Error(`Bị chặn bởi bộ lọc an toàn: ${blockReason}.`);
            throw new Error("Không tìm thấy dữ liệu ảnh trong phản hồi.");

        } catch (error) {
            console.error(`Lỗi tạo ảnh (lần thử ${attempt}/${maxRetries}):`, error);
            if (error instanceof Error && (error.message.toLowerCase().includes('quota') || error.message.toLowerCase().includes('limit'))) {
                 throw error;
            }

            if (attempt < maxRetries) {
                console.warn("Thử lại, viết lại prompt.");
                currentPrompt = await rewritePromptForImageGeneration(prompt, language);
            } else {
                throw new Error(`Lỗi khi tạo ảnh từ API: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`);
            }
        }
    }
    
    throw new Error("Không thể tạo ảnh sau nhiều lần thử.");
};

export const generateImageWithReferences = async (prompt: string, characters: Character[], setting: Setting | null, styleReferences: ImageResult[] = [], language: string = 'Vietnamese'): Promise<string> => {
    const imageStylePrompt = createImageStylePromptSuffix(setting, language);
    let currentTextPrompt = prompt;
    const maxRetries = 2;
    const isVietnamese = language.toLowerCase() === 'vietnamese';

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const parts: any[] = [];
            let textPrompt = '';
            
            const charactersInPrompt = characters.filter(c => currentTextPrompt.toLowerCase().includes(c.name.toLowerCase()));
            const charactersWithRefs = charactersInPrompt.filter(c => c.referenceImageUrl);

            if (isVietnamese) {
                textPrompt = `**YÊU CẦU:** Phân tích kỹ lưỡng các hình ảnh tham khảo được cung cấp. Chúng bao gồm tham khảo PHONG CÁCH và tham khảo NGOẠI HÌNH NHÂN VẬT. Sau đó, tạo một hình ảnh mới dựa trên prompt sau: "${currentTextPrompt}".
**QUY TẮC BẮT BUỘC:**
1.  **PHONG CÁCH:** Hình ảnh mới phải tuân thủ nghiêm ngặt phong cách (ánh sáng, màu sắc, bố cục, không khí) của các hình tham khảo phong cách.
2.  **NHÂN VẬT:** Các nhân vật được đề cập phải trông giống hệt với hình ảnh tham khảo của họ.
3.  **HƯỚNG DẪN BỔ SUNG:** Ngoài ra, hãy áp dụng các hướng dẫn phong cách chi tiết sau đây:\n\n${imageStylePrompt}`;
            } else {
                textPrompt = `**REQUEST:** Thoroughly analyze the provided reference images. They include STYLE references and CHARACTER APPEARANCE references. Then, create a new image based on the following prompt: "${currentTextPrompt}".
**MANDATORY RULES:**
1.  **STYLE:** The new image must strictly adhere to the style (lighting, color, composition, atmosphere) of the style reference images.
2.  **CHARACTERS:** Mentioned characters must look exactly like their reference images.
3.  **ADDITIONAL GUIDELINES:** Also, apply the following detailed style guide:\n\n${imageStylePrompt}`;
            }

            parts.push({ text: textPrompt });

            // Add style references
            if (styleReferences.length > 0) {
                 parts.push({ text: isVietnamese ? "--- BẮT ĐẦU THAM KHẢO PHONG CÁCH ---" : "--- BEGIN STYLE REFERENCES ---" });
                 for (const ref of styleReferences) {
                    if (ref.url) {
                        const imagePart = dataUrlToPart(ref.url);
                        if (imagePart) parts.push(imagePart);
                    }
                }
            }

            // Add character references
            if (charactersWithRefs.length > 0) {
                parts.push({ text: isVietnamese ? "--- BẮT ĐẦU THAM KHẢO NHÂN VẬT ---" : "--- BEGIN CHARACTER REFERENCES ---" });
                 for (const char of charactersWithRefs) {
                    if (char.referenceImageUrl) {
                        const imagePart = dataUrlToPart(char.referenceImageUrl);
                        if (imagePart) {
                             parts.push({ text: `Reference for character: ${char.name}` });
                             parts.push(imagePart);
                        }
                    }
                }
            }
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts },
                config: {
                    responseModalities: [Modality.IMAGE],
                    safetySettings,
                },
            });

            const candidate = response?.candidates?.[0];
            if (candidate && candidate.content && Array.isArray(candidate.content.parts)) {
                for (const part of candidate.content.parts) {
                    if (part?.inlineData?.data) {
                        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                    }
                }
            }

            const blockReason = response?.promptFeedback?.blockReason;
            if (blockReason) throw new Error(`Bị chặn bởi bộ lọc an toàn: ${blockReason}.`);
            throw new Error("Không tìm thấy dữ liệu ảnh trong phản hồi.");

        } catch (error) {
            console.error(`Lỗi tạo ảnh với tham chiếu (lần thử ${attempt}/${maxRetries}):`, error);
            if (error instanceof Error && (error.message.toLowerCase().includes('quota') || error.message.toLowerCase().includes('limit'))) {
                 throw error;
            }
            
            if (attempt < maxRetries) {
                console.warn("Thử lại do lỗi, viết lại prompt.");
                currentTextPrompt = await rewritePromptForImageGeneration(prompt, language);
            } else {
                throw new Error(`Lỗi khi tạo ảnh với tham chiếu: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`);
            }
        }
    }
    throw new Error("Không thể tạo ảnh với tham chiếu sau nhiều lần thử.");
};

export const summarizeScript = async (script: string, language: string = 'Vietnamese'): Promise<string> => {
    const prompt = `Please summarize the following script in a few sentences to provide context for generating video scenes. This is for a technical documentary about an aviation incident. Focus on the key events and technical aspects. The summary should be in ${language}.
    
    SCRIPT:
    ---
    ${script}
    ---
    
    Return only the summary text.`;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { safetySettings }
        });
        return response.text.trim();
    } catch (error) {
        console.error("Lỗi khi tóm tắt kịch bản:", error);
        // Fallback to truncating the script
        return script.substring(0, 1000) + '...';
    }
};

export const generateVideoPromptForScene = async (
    sceneDescription: string,
    imageUrl: string,
    characters: Character[],
    scriptSummary: string,
    language: string = 'Vietnamese'
): Promise<string> => {
    const characterProfiles = characters.map(c => `- ${c.name}: ${c.appearanceAndBehavior}`).join('\n');
    const imagePart = dataUrlToPart(imageUrl);
    if (!imagePart) {
        throw new Error("Định dạng ảnh không hợp lệ để tạo prompt video.");
    }
    
    const isVietnamese = language.toLowerCase() === 'vietnamese';
    const prompt_vi = `Bạn là đạo diễn sáng tạo cho một loạt phim tài liệu kỹ thuật. Nhiệm vụ của bạn là tạo ra một prompt video hấp dẫn, duy nhất cho một cảnh cụ thể.

    **Bối cảnh câu chuyện tổng thể (Tóm tắt):**
    ${scriptSummary}

    **Các nhân vật chính liên quan:**
    ${characterProfiles}

    **Mô tả cảnh hiện tại:**
    "${sceneDescription}"

    **Hình ảnh khung hình chính cho cảnh này:**
    [HÌNH ẢNH ĐƯỢC CUNG CẤP]

    **Nhiệm vụ của bạn:**
    Dựa trên tất cả thông tin trên (tóm tắt, nhân vật, mô tả cảnh và hình ảnh được cung cấp), hãy viết một prompt DUY NHẤT, chi tiết để tạo một video clip ngắn (khoảng 5-10 giây). Prompt phải bằng tiếng Việt.
    
    Prompt cần chỉ định:
    1.  **Góc máy:** Góc quay (ví dụ: cận cảnh, toàn cảnh), chuyển động (ví dụ: phóng to chậm, lia máy).
    2.  **Hành động:** Chuyện gì đang xảy ra trong cảnh? Các nhân vật hoặc vật thể đang làm gì?
    3.  **Không khí:** Tâm trạng và cảm giác của cảnh (ví dụ: căng thẳng, kịch tính, phân tích).
    4.  **Phong cách hình ảnh:** Giữ sự nhất quán với phong cách phim tài liệu kỹ thuật cao, siêu thực với các lớp phủ đồ họa thông tin.

    **Đầu ra:**
    CHỈ trả về prompt video dưới dạng một chuỗi văn bản duy nhất. Không thêm bất kỳ lời giải thích hay định dạng nào.
    `;
    const prompt_en = `You are a creative director for a technical documentary series. Your task is to create a single, compelling video prompt for a specific scene.

    **Overall Story Context (Summary):**
    ${scriptSummary}

    **Relevant Main Characters:**
    ${characterProfiles}

    **Current Scene Description:**
    "${sceneDescription}"

    **Keyframe Image for this Scene:**
    [IMAGE PROVIDED]

    **Your Task:**
    Based on all the information above (summary, characters, scene description, and the provided image), write a SINGLE, detailed prompt to generate a short video clip (around 5-10 seconds). The prompt must be in English.
    
    The prompt should specify:
    1.  **Camera:** Shot angle (e.g., close-up, wide shot), movement (e.g., slow zoom in, pan).
    2.  **Action:** What is happening in the scene? What are the characters or objects doing?
    3.  **Atmosphere:** The mood and feeling of the scene (e.g., tense, dramatic, analytical).
    4.  **Visual Style:** Maintain consistency with the hyper-realistic, high-tech documentary style with informational graphic overlays.

    **Output:**
    ONLY return the video prompt as a single string of text. Do not add any explanation or formatting.
    `;
    const prompt = isVietnamese ? prompt_vi : prompt_en;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: { parts: [{text: prompt}, imagePart] },
            config: {
                safetySettings,
            }
        });
    
        const text = response.text.trim();
        if (!text) {
             const blockReason = response?.promptFeedback?.blockReason;
            if (blockReason) {
                throw new Error(`Bị chặn bởi bộ lọc an toàn: ${blockReason}.`);
            }
            throw new Error("Phản hồi từ AI trống rỗng.");
        }
        return text;
    } catch(error) {
        console.error("Lỗi tạo prompt video cho cảnh:", error);
        if (error instanceof Error) {
            if (error.message.toLowerCase().includes('quota') || error.message.toLowerCase().includes('limit')) {
                throw error;
            }
        }
        return isVietnamese 
            ? `Một video clip tài liệu kỹ thuật về "${sceneDescription}", tập trung vào các chi tiết máy móc, với các lớp phủ đồ họa thông tin giải thích những gì đang xảy ra.`
            : `A technical documentary video clip about "${sceneDescription}", focusing on mechanical details, with informational graphic overlays explaining what is happening.`;
    }
};

export const generateThumbnailVariations = async (topic: string, script: string, characters: Character[], count: number = 4, setting: Setting | null, styleReferences: ImageResult[] = [], language: string = 'Vietnamese'): Promise<string[]> => {
    const imageStylePrompt = createImageStylePromptSuffix(setting, language);
    const isVietnamese = language.toLowerCase() === 'vietnamese';

    const generateSingleThumbnail = async (): Promise<string> => {
        let currentTopic = topic;
        const maxRetries = 2;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const parts: any[] = [];
                let textPrompt = isVietnamese
                    ? `Phân tích các hình tham khảo phong cách. Tạo một thumbnail YouTube chất lượng 4K, kịch tính cho video có chủ đề "${currentTopic}". Thumbnail phải khớp với phong cách tham khảo.`
                    : `Analyze the style reference images. Create a dramatic, 4K-quality YouTube thumbnail for a video on the topic of "${currentTopic}". The thumbnail must match the reference style.`;
                
                const charactersInTopic = characters.filter(c => currentTopic.toLowerCase().includes(c.name.toLowerCase()));
                 if (charactersInTopic.length > 0) {
                    const characterDetails = charactersInTopic
                        .map(c => `${c.name}: ${c.appearanceAndBehavior}`)
                        .join('; ');
                    textPrompt += isVietnamese ? `\nNhân vật nổi bật: ${characterDetails}.` : `\nFeatured characters: ${characterDetails}.`;
                }

                textPrompt += isVietnamese
                    ? `\n\nTiêu đề chính trên thumbnail phải lớn, rõ ràng, màu vàng với viền đen. Bối cảnh nên dựa trên nội dung kịch bản sau: ${script}\n\n${imageStylePrompt}`
                    : `\n\nThe main title on the thumbnail should be large, clear, yellow with a black outline. The context should be based on the following script content: ${script}\n\n${imageStylePrompt}`;
                
                parts.push({ text: textPrompt });

                for (const ref of styleReferences) {
                    if (ref.url) {
                        const imagePart = dataUrlToPart(ref.url);
                        if (imagePart) parts.push(imagePart);
                    }
                }
                
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: { parts },
                    config: {
                        responseModalities: [Modality.IMAGE],
                        safetySettings,
                    },
                });

                const candidate = response?.candidates?.[0];
                if (candidate && candidate.content && Array.isArray(candidate.content.parts)) {
                    for (const part of candidate.content.parts) {
                        if (part?.inlineData?.data) {
                            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                        }
                    }
                }
                
                throw new Error("Không tìm thấy dữ liệu ảnh trong phản hồi thumbnail.");

            } catch (error) {
                console.error(`Lỗi tạo thumbnail (lần thử ${attempt}/${maxRetries}):`, error);
                if (error instanceof Error && (error.message.toLowerCase().includes('quota') || error.message.toLowerCase().includes('limit'))) {
                     throw error;
                }

                if (attempt < maxRetries) {
                    console.warn("Thử lại, viết lại prompt thumbnail.");
                    currentTopic = await rewritePromptForImageGeneration(topic, language);
                } else {
                    throw new Error(`Lỗi khi tạo thumbnail: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`);
                }
            }
        }
        throw new Error("Không thể tạo thumbnail sau nhiều lần thử.");
    };

    try {
        const promises = Array.from({ length: count }, () => generateSingleThumbnail());
        return await Promise.all(promises);
    } catch(error) {
        console.error("Lỗi khi tạo các phiên bản thumbnail:", error);
        if (error instanceof Error) throw error;
        throw new Error("Không thể tạo các phiên bản thumbnail.");
    }
};

export const editImage = async (prompt: string, image: { base64: string; mimeType: string }, language: string, styleReferences: ImageResult[] = []): Promise<string> => {
    const imageStylePrompt = createImageStylePromptSuffix(null, language);
    const isVietnamese = language.toLowerCase() === 'vietnamese';
    let currentPrompt = isVietnamese 
        ? `Yêu cầu chỉnh sửa cho ảnh này bằng tiếng Việt là: "${prompt}".`
        : `The edit request for this image in English is: "${prompt}".`;

    currentPrompt += isVietnamese
        ? ` SAU KHI CHỈNH SỬA, ẢNH MỚI PHẢI TUÂN THỦ NGHIÊM NGẶT các yêu cầu kỹ thuật và phong cách sau: ${imageStylePrompt}`
        : ` AFTER EDITING, THE NEW IMAGE MUST STRICTLY ADHERE to the following technical and stylistic requirements: ${imageStylePrompt}`;

    const originalPromptForRewrite = prompt;
    const maxRetries = 2;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const parts: any[] = [
                { inlineData: { data: image.base64, mimeType: image.mimeType } },
                { text: currentPrompt },
            ];

            // NOTE: Style references for editing are kept as they might help guide the edit model.
            for (const ref of styleReferences) {
                const imagePart = dataUrlToPart(ref.url!);
                if (imagePart) parts.push(imagePart);
            }

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts },
                config: { 
                    responseModalities: [Modality.IMAGE],
                    safetySettings,
                },
            });

            const candidate = response?.candidates?.[0];
            if (candidate && candidate.content && Array.isArray(candidate.content.parts)) {
                for (const part of candidate.content.parts) {
                    if (part && part.inlineData && part.inlineData.data) {
                        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                    }
                }
            }
            
            const blockReason = response?.promptFeedback?.blockReason;
            if (blockReason) {
                throw new Error(`Bị chặn bởi bộ lọc an toàn: ${blockReason}.`);
            }
            throw new Error("Không tìm thấy dữ liệu ảnh đã chỉnh sửa.");
        } catch (error) {
            console.error(`Lỗi chỉnh sửa ảnh (lần thử ${attempt}/${maxRetries}):`, error);
             if (error instanceof Error && (error.message.toLowerCase().includes('quota') || error.message.toLowerCase().includes('limit'))) {
                 throw error;
            }

            if (attempt < maxRetries) {
                console.warn("Thử lại do lỗi, viết lại prompt chỉnh sửa.");
                const rewrittenPrompt = await rewritePromptForImageGeneration(originalPromptForRewrite, language);
                currentPrompt = isVietnamese
                    ? `Yêu cầu chỉnh sửa cho ảnh này bằng tiếng Việt là (đã được làm rõ hơn): "${rewrittenPrompt}". SAU KHI CHỈNH SỬA, ẢNH MỚI PHẢI TUÂN THỦ NGHIÊM NGẶT các yêu cầu kỹ thuật và phong cách sau: ${imageStylePrompt}`
                    : `The edit request for this image in English is (clarified): "${rewrittenPrompt}". AFTER EDITING, THE NEW IMAGE MUST STRICTLY ADHERE to the following technical and stylistic requirements: ${imageStylePrompt}`;
            } else {
                throw new Error(`Lỗi khi chỉnh sửa ảnh: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`);
            }
        }
    }
    throw new Error("Không thể chỉnh sửa ảnh sau nhiều lần thử.");
};
