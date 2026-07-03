import React, { useState, useEffect } from 'react';

interface ScoringConfigProps {
  // No props
}

interface ScoringFactors {
  leiVerification: number;
  priceCorrelation: number;
  complianceCheck: number;
  historyDepth: number;
  crossReference: number;
}

const ScoringConfig: React.FC<ScoringConfigProps> = () => {
  const [scoringFactors, setScoringFactors] = useState<ScoringFactors>({
    leiVerification: 50,
    priceCorrelation: 50,
    complianceCheck: 50,
    historyDepth: 50,
    crossReference: 50,
  });

  const [totalWeight, setTotalWeight] = useState(0);
  const [previewScore, setPreviewScore] = useState(0);
  const [profiles, setProfiles] = useState<{ [key: string]: ScoringFactors }>({});
  const [selectedProfile, setSelectedProfile] = useState('');

  useEffect(() => {
    const storedProfiles = localStorage.getItem('profiles');
    if (storedProfiles) {
      setProfiles(JSON.parse(storedProfiles));
    }
  }, []);

  useEffect(() => {
    const calculateTotalWeight = () => {
      const total = Object.values(scoringFactors).reduce((acc, val) => acc + val, 0);
      setTotalWeight(total);
    };
    calculateTotalWeight();
  }, [scoringFactors]);

  useEffect(() => {
    const calculatePreviewScore = () => {
      const sampleAsset = {
        leiVerification: 0.8,
        priceCorrelation: 0.7,
        complianceCheck: 0.9,
        historyDepth: 0.6,
        crossReference: 0.8,
      };
      const score =
        (scoringFactors.leiVerification * sampleAsset.leiVerification +
          scoringFactors.priceCorrelation * sampleAsset.priceCorrelation +
          scoringFactors.complianceCheck * sampleAsset.complianceCheck +
          scoringFactors.historyDepth * sampleAsset.historyDepth +
          scoringFactors.crossReference * sampleAsset.crossReference) /
        totalWeight;
      setPreviewScore(score * 100);
    };
    calculatePreviewScore();
  }, [scoringFactors, totalWeight]);

  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setScoringFactors((prevFactors) => ({ ...prevFactors, [name]: parseInt(value) }));
  };

  const handleSaveProfile = () => {
    const profileName = prompt('Enter profile name');
    if (profileName) {
      setProfiles((prevProfiles) => ({ ...prevProfiles, [profileName]: scoringFactors }));
      localStorage.setItem('profiles', JSON.stringify({ ...profiles, [profileName]: scoringFactors }));
    }
  };

  const handleLoadProfile = (profileName: string) => {
    setSelectedProfile(profileName);
    setScoringFactors(profiles[profileName]);
  };

  const handleReset = () => {
    setScoringFactors({
      leiVerification: 50,
      priceCorrelation: 50,
      complianceCheck: 50,
      historyDepth: 50,
      crossReference: 50,
    });
  };

  return (
    <div className="scoring-config">
      <h2>Scoring Weight Configuration</h2>
      <div className="sliders">
        <div className="slider">
          <label>LEI Verification</label>
          <input
            type="range"
            min="0"
            max="100"
            value={scoringFactors.leiVerification}
            name="leiVerification"
            onChange={handleSliderChange}
          />
          <span>{scoringFactors.leiVerification}</span>
        </div>
        <div className="slider">
          <label>Price Correlation</label>
          <input
            type="range"
            min="0"
            max="100"
            value={scoringFactors.priceCorrelation}
            name="priceCorrelation"
            onChange={handleSliderChange}
          />
          <span>{scoringFactors.priceCorrelation}</span>
        </div>
        <div className="slider">
          <label>Compliance Check</label>
          <input
            type="range"
            min="0"
            max="100"
            value={scoringFactors.complianceCheck}
            name="complianceCheck"
            onChange={handleSliderChange}
          />
          <span>{scoringFactors.complianceCheck}</span>
        </div>
        <div className="slider">
          <label>History Depth</label>
          <input
            type="range"
            min="0"
            max="100"
            value={scoringFactors.historyDepth}
            name="historyDepth"
            onChange={handleSliderChange}
          />
          <span>{scoringFactors.historyDepth}</span>
        </div>
        <div className="slider">
          <label>Cross-Reference</label>
          <input
            type="range"
            min="0"
            max="100"
            value={scoringFactors.crossReference}
            name="crossReference"
            onChange={handleSliderChange}
          />
          <span>{scoringFactors.crossReference}</span>
        </div>
      </div>
      <p>Total Weight: {totalWeight}</p>
      <div className="preview">
        <h3>Preview</h3>
        <p>Sample Asset Score: {previewScore.toFixed(2)}%</p>
      </div>
      <div className="profiles">
        <h3>Profiles</h3>
        <select value={selectedProfile} onChange={(e) => handleLoadProfile(e.target.value)}>
          <option value="">Select Profile</option>
          {Object.keys(profiles).map((profileName) => (
            <option key={profileName} value={profileName}>
              {profileName}
            </option>
          ))}
        </select>
        <button onClick={handleSaveProfile}>Save Profile</button>
        <button onClick={handleReset}>Reset to Defaults</button>
      </div>
    </div>
  );
};

export default ScoringConfig;
