import React, { useState, useEffect } from 'react';
import './App.css';

// 파일 업로드 컴포넌트
const FileUpload = ({ isLoading, onFileSelect }) => {
  const fileInputRef = React.useRef(null);

  const handleClick = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="upload-section" onClick={handleClick}>
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={onFileSelect}
        disabled={isLoading}
        style={{ display: 'none' }}
      />
      <p className="text-lg font-medium text-gray-900 mb-2">
        식물 이미지 업로드
      </p>
      <p className="text-sm text-gray-500">
        이미지를 클릭하거나 드래그하여 업로드하세요
      </p>
    </div>
  );
};

// 로딩 컴포넌트
const LoadingCard = () => (
  <div className="loading-card">
    <div className="loading-content">
      <div className="loading-spinner"></div>
      <div className="loading-text">
        <h3>식물을 분석하고 있습니다</h3>
        <p>잠시만 기다려주세요...</p>
      </div>
      <div className="loading-steps">
        <div className="step completed">
          <span className="step-number">1</span>
          <span className="step-text">이미지 업로드 완료</span>
        </div>
        <div className="step active">
          <span className="step-number">2</span>
          <span className="step-text">AI 분석 진행중</span>
        </div>
        <div className="step">
          <span className="step-number">3</span>
          <span className="step-text">결과 생성</span>
        </div>
      </div>
    </div>
  </div>
);

// 이미지 프리뷰 컴포넌트 수정
const ImagePreview = ({ image }) => {
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    const url = URL.createObjectURL(image);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  return (
    <div className="image-preview-wrapper">
      <div className="image-preview-container">
        <div className="image-preview-header">
          <h3>선택된 이미지</h3>
        </div>
        <div className="image-preview-content">
          <img src={imageUrl} alt="선택된 식물" />
        </div>
      </div>
    </div>
  );
};

// 메인 컴포넌트
function App() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [plantInfo, setPlantInfo] = useState(null);
  
  const API_KEY = process.env.REACT_APP_GEMINI_API_KEY;

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedImage(file);
      setError(null);
      analyzePlant(file);
    }
  };

  const parsePlantInfo = (text) => {
    try {
      const plantData = {
        name: "정보를 찾을 수 없습니다",
        scientificName: "정보를 찾을 수 없습니다",
        difficulty: "초급",
        waterFrequency: "정보를 찾을 수 없습니다",
        temperature: "정보를 찾을 수 없습니다",
        humidity: "정보를 찾을 수 없습니다",
        features: [],
        precautions: []
      };

      const lines = text.split('\n');
      let currentSection = '';

      lines.forEach(line => {
        line = line.trim();
        if (line.includes('이름:') || line.includes('식물:')) {
          plantData.name = line.split(':')[1].trim();
        } else if (line.includes('학명:')) {
          plantData.scientificName = line.split(':')[1].trim();
        } else if (line.toLowerCase().includes('물주기:')) {
          plantData.waterFrequency = line.split(':')[1].trim();
        } else if (line.includes('온도:')) {
          plantData.temperature = line.split(':')[1].trim();
        } else if (line.includes('습도:')) {
          plantData.humidity = line.split(':')[1].trim();
        } else if (line.includes('특징:')) {
          currentSection = 'features';
        } else if (line.includes('주의사항:')) {
          currentSection = 'precautions';
        } else if (line && currentSection) {
          if (line.startsWith('-') || line.startsWith('•')) {
            line = line.substring(1).trim();
          }
          if (line && currentSection === 'features') {
            plantData.features.push(line);
          } else if (line && currentSection === 'precautions') {
            plantData.precautions.push(line);
          }
        }
      });

      return plantData;
    } catch (error) {
      console.error('Parsing error:', error);
      throw new Error('식물 정보 파싱 중 오류가 발생했습니다.');
    }
  };

  // analyzePlant 함수 수정
  const analyzePlant = async (file) => {
    if (!API_KEY) {
      setError('API 키가 설정되지 않았습니다');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('파일 크기는 5MB 이하여야 합니다.');
      }

      const reader = new FileReader();
      
      reader.onerror = () => {
        setError('파일 읽기 중 오류가 발생했습니다.');
        setIsLoading(false);
      };

      reader.readAsDataURL(file);
      
      reader.onloadend = async () => {
        try {
          const base64Image = reader.result.split(',')[1];
          
          const requestBody = {
            contents: [{
              parts: [
                {
                  text: `이 식물의 정보를 다음 형식으로 알려주세요:
이름:
학명:
물주기:
온도:
습도:
특징:
- 특징1
- 특징2
주의사항:
- 주의사항1
- 주의사항2`
                },
                {
                  inlineData: {
                    mimeType: "image/jpeg",
                    data: base64Image
                  }
                }
              ]
            }]
          };

          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${API_KEY}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(requestBody)
            }
          );

          if (!response.ok) {
            throw new Error(`서버 오류: ${response.status}`);
          }

          const data = await response.json();
          
          if (data.candidates?.[0]?.content) {
            const text = data.candidates[0].content.parts[0].text;
            console.log('API Response:', text);
            
            const plantData = parsePlantInfo(text);
            setPlantInfo(plantData);
          } else {
            throw new Error('API 응답 형식이 올바르지 않습니다.');
          }
          
        } catch (error) {
          console.error('Error:', error);
          setError(`이미지 분석 중 오류가 발생했습니다: ${error.message}`);
          setPlantInfo(null);
        } finally {
          setIsLoading(false);
        }
      };
    } catch (error) {
      console.error('Error:', error);
      setError(error.message || '이미지 처리 중 오류가 발생했습니다.');
      setPlantInfo(null);
      setIsLoading(false);
    }
  };

  const PlantCard = ({ name, scientificName, waterFrequency, temperature, humidity, difficulty, features, precautions }) => {
    return (
      <div className="card">
        <h2>🌿 {name} <span style={{ fontSize: '14px', color: '#888' }}>({difficulty})</span></h2>
        {scientificName !== "정보를 찾을 수 없습니다" && <h3>{scientificName}</h3>}
        <div className="tags">
          <span className="tag related">관엽식물</span>
          <span className="tag level">초급</span>
        </div>
        <div className="info-section">
          {waterFrequency !== "정보를 찾을 수 없습니다" && <p>💧 물주기: {waterFrequency}</p>}
          {temperature !== "정보를 찾을 수 없습니다" && <p>🌡️ 적정 온도: {temperature}</p>}
          {humidity !== "정보를 찾을 수 없습니다" && <p>💨 습도: {humidity}</p>}
        </div>
        {features.length > 0 && (
          <div className="features-section">
            <h4>특징</h4>
            <ul>
              {features.map((feature, index) => (
                <li key={index}>✨ {feature}</li>
              ))}
            </ul>
          </div>
        )}
        {precautions.length > 0 && (
          <div className="precautions-section">
            <h4>주의사항</h4>
            <ul>
              {precautions.map((precaution, index) => (
                <li key={index}>⚠️ {precaution}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="App">
      <h1>Plant Identifier</h1>
      
      <FileUpload
        isLoading={isLoading}
        onFileSelect={handleImageUpload}
      />

      {selectedImage && <ImagePreview image={selectedImage} />}
      
      {isLoading && <LoadingCard />}
      
      {error && (
        <div className="error">
          <p>{error}</p>
        </div>
      )}
      
      {plantInfo && !error && <PlantCard {...plantInfo} />}
    </div>
  );
}

export default App;