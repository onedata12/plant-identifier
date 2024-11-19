import React, { useState } from 'react';
import './App.css';

function App() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const API_KEY = process.env.REACT_APP_GEMINI_API_KEY;

  // 이미지 선택 핸들러
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    setSelectedImage(file);
  };

  // 폼 제출 핸들러
  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!selectedImage) {
      alert('이미지를 선택해주세요');
      return;
    }
    
    if (!API_KEY) {
      alert('API 키가 설정되지 않았습니다');
      return;
    }

    setIsLoading(true);
    setResult('이미지 분석 중...');

    try {
      // 이미지를 Base64로 변환
      const reader = new FileReader();
      reader.readAsDataURL(selectedImage);
      
      reader.onloadend = async () => {
        try {
          const base64Image = reader.result.split(',')[1];
          
          // base64 디코딩 후 다시 인코딩하여 이미지 데이터 정제
          const cleanBase64 = btoa(atob(base64Image));
          
          const requestBody = {
            contents: [{
              parts: [
                {
                  text: "이 식물이나 꽃이 무엇인지 한국어로 설명해주세요."
                },
                {
                  inlineData: {
                    mimeType: "image/jpeg",
                    data: cleanBase64
                  }
                }
              ]
            }]
          };

          // 디버깅을 위한 로그
          console.log('Original base64 length:', base64Image.length);
          console.log('Cleaned base64 length:', cleanBase64.length);

          // 요청 내용 확인
          console.log('Request details:', {
            url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent`,
            bodyLength: JSON.stringify(requestBody).length
          });

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
            const errorData = await response.text();
            console.error('API Error Response:', errorData);
            throw new Error(`HTTP error! status: ${response.status}, details: ${errorData}`);
          }

          const data = await response.json();
          setResult(data.candidates[0].content.parts[0].text);
          
        } catch (error) {
          console.error('Full error:', error);
          setResult(`이미지 처리 중 오류가 발생했습니다: ${error.message}`);
        }
      };
    } catch (error) {
      console.error('Error:', error);
      setResult('이미지 처리 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="App">
      <h1>식물 식별기</h1>
      
      <form onSubmit={handleSubmit}>
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? '분석 중...' : '분석하기'}
        </button>
      </form>

      {selectedImage && (
        <div className="preview">
          <h3>선택된 이미지:</h3>
          <img
            src={URL.createObjectURL(selectedImage)}
            alt="선택된 식물"
            style={{ maxWidth: '300px' }}
          />
        </div>
      )}

      {result && (
        <div className="result">
          <h3>분석 결과:</h3>
          <p>{result}</p>
        </div>
      )}
    </div>
  );
}

export default App; 