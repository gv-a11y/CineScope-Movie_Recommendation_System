import re
content = open('C:/Users/GODWIN VINCENT/Desktop/MRS/static/css/style.css', 'r', encoding='utf-8').read()

content = re.sub(
    r'\.tv-frame \{[^\}]+\}', 
    '.tv-frame {\n    background: linear-gradient(145deg, #2e2e3a, #191920);\n    border-radius: 18px;\n    padding: 14px 14px 10px;\n    border: 2px solid rgba(255, 255, 255, 0.1);\n    box-shadow:\n        0 0 0 1px rgba(98, 0, 234, 0.2),\n        0 30px 70px rgba(0, 0, 0, 0.9),\n        0 0 40px rgba(98, 0, 234, 0.5);\n    width: 450px;\n}', 
    content
)

content = re.sub(
    r'\.orbit-stage::before \{[^\}]+\}', 
    '.orbit-stage::before {\n    content: \'\';\n    position: absolute;\n    width: 1100px;\n    height: 1100px;\n    margin-left: -550px;\n    margin-top: -550px;\n    border-radius: 50%;\n    border: 1px solid rgba(98, 0, 234, 0.12);\n    box-shadow:\n        0 0 60px rgba(98, 0, 234, 0.08),\n        inset 0 0 60px rgba(98, 0, 234, 0.05);\n}', 
    content
)

content = re.sub(
    r'\.tv-center \{[^\}]+\}', 
    '.tv-center {\n    position: absolute;\n    top: 50%;\n    left: 50%;\n    transform: translate(-50%, -50%) rotateX(25deg) translateZ(-80px);\n    display: flex;\n    flex-direction: column;\n    align-items: center;\n    pointer-events: none;\n    transform-style: preserve-3d;\n}', 
    content
)

content = re.sub(
    r'\.tv-screen-content \{[^\}]+\}', 
    '.tv-screen-content {\n    position: relative;\n    z-index: 3;\n    text-align: center;\n    font-size: 2.5rem;\n    font-weight: 800;\n    letter-spacing: 6px;\n    text-transform: uppercase;\n}', 
    content
)

open('C:/Users/GODWIN VINCENT/Desktop/MRS/static/css/style.css', 'w', encoding='utf-8').write(content)
print('SUCCESS!')
